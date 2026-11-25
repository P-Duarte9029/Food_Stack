import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  REALTIME_EVENTS,
  type OpenTableSessionInput,
  type TableSession,
} from '@food-stack/shared';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { tableSessionSelect, toTableSession } from './table-session.mapper';

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

@Injectable()
export class TableSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async listOpen(restaurantId: string): Promise<TableSession[]> {
    const records = await this.prisma.tableSession.findMany({
      where: { restaurantId, closedAt: null },
      orderBy: { openedAt: 'asc' },
      select: tableSessionSelect,
    });
    return records.map(toTableSession);
  }

  async open(restaurantId: string, input: OpenTableSessionInput): Promise<TableSession> {
    if (input.id) {
      const existing = await this.findForRetry(restaurantId, input.id);
      if (existing) return existing;
    }

    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: { tablesCount: true },
    });
    if (input.table > restaurant.tablesCount) throw new BadRequestException('Mesa inexistente');

    let session: TableSession;
    try {
      session = toTableSession(
        await this.prisma.tableSession.create({
          data: {
            id: input.id,
            restaurantId,
            table: input.table,
            customerName: input.customerName,
            openTableKey: `${restaurantId}:${input.table}`,
          },
          select: tableSessionSelect,
        }),
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Reenvio simultâneo do mesmo id devolve a sessão já criada; senão a mesa já está ocupada.
      const existing = input.id ? await this.findForRetry(restaurantId, input.id) : null;
      if (existing) return existing;
      throw new ConflictException('A mesa já está aberta');
    }
    await this.publishChange(restaurantId);
    return session;
  }

  async close(restaurantId: string, id: string): Promise<void> {
    const { count } = await this.prisma.tableSession.updateMany({
      where: { id, restaurantId, closedAt: null },
      data: { closedAt: new Date(), openTableKey: null },
    });
    if (count === 0) {
      const exists = await this.prisma.tableSession.findFirst({
        where: { id, restaurantId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Mesa aberta não encontrada');
      return; // já estava fechada: fechar de novo não é erro
    }
    await this.publishChange(restaurantId);
  }

  private async findForRetry(restaurantId: string, id: string): Promise<TableSession | null> {
    const existing = await this.prisma.tableSession.findUnique({
      where: { id },
      select: { ...tableSessionSelect, restaurantId: true },
    });
    if (!existing) return null;
    if (existing.restaurantId !== restaurantId) {
      throw new ConflictException('Identificador de mesa já utilizado');
    }
    return toTableSession(existing);
  }

  private async publishChange(restaurantId: string): Promise<void> {
    this.realtime.publish(
      restaurantId,
      REALTIME_EVENTS.tableSessionsChanged,
      await this.listOpen(restaurantId),
    );
  }
}
