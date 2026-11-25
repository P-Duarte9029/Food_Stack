import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  REALTIME_EVENTS,
  type AddGuestCheckInput,
  type GuestCheck,
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
            checks: { create: { id: input.checkId, name: input.customerName } },
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

  /** Fecha a mesa e todas as comandas abertas dela. */
  async close(restaurantId: string, id: string): Promise<void> {
    const closed = await this.closeSession(restaurantId, id);
    if (!closed) {
      const exists = await this.prisma.tableSession.findFirst({
        where: { id, restaurantId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Mesa aberta não encontrada');
      return; // já estava fechada: fechar de novo não é erro
    }
    await this.publishChange(restaurantId);
  }

  async addCheck(
    restaurantId: string,
    sessionId: string,
    input: AddGuestCheckInput,
  ): Promise<GuestCheck> {
    if (input.id) {
      const existing = await this.findCheckForRetry(restaurantId, input.id);
      if (existing) return existing;
    }

    const session = await this.prisma.tableSession.findFirst({
      where: { id: sessionId, restaurantId, closedAt: null },
      select: { customerName: true, checks: { where: { closedAt: null }, select: { id: true } } },
    });
    if (!session) throw new NotFoundException('Mesa aberta não encontrada');

    const created = { id: input.id, tableSessionId: sessionId, name: input.name };
    let check: GuestCheck;
    try {
      if (session.checks.length === 0) {
        // Mesa aberta antes das comandas: quem abriu a mesa vira a primeira comanda.
        const [, added] = await this.prisma.$transaction([
          this.prisma.guestCheck.create({
            data: { tableSessionId: sessionId, name: session.customerName },
          }),
          this.prisma.guestCheck.create({ data: created, select: { id: true, name: true } }),
        ]);
        check = added;
      } else {
        check = await this.prisma.guestCheck.create({
          data: created,
          select: { id: true, name: true },
        });
      }
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = input.id ? await this.findCheckForRetry(restaurantId, input.id) : null;
      if (existing) return existing;
      throw error;
    }
    await this.publishChange(restaurantId);
    return check;
  }

  /** Fecha a comanda; ao fechar a última comanda aberta, a mesa também é fechada. */
  async closeCheck(restaurantId: string, sessionId: string, checkId: string): Promise<void> {
    const { count } = await this.prisma.guestCheck.updateMany({
      where: {
        id: checkId,
        tableSessionId: sessionId,
        closedAt: null,
        tableSession: { restaurantId, closedAt: null },
      },
      data: { closedAt: new Date() },
    });
    if (count === 0) {
      const exists = await this.prisma.guestCheck.findFirst({
        where: { id: checkId, tableSessionId: sessionId, tableSession: { restaurantId } },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Comanda não encontrada');
      return; // já estava fechada
    }

    const open = await this.prisma.guestCheck.count({
      where: { tableSessionId: sessionId, closedAt: null },
    });
    if (open === 0) await this.closeSession(restaurantId, sessionId);
    await this.publishChange(restaurantId);
  }

  private async closeSession(restaurantId: string, id: string): Promise<boolean> {
    const now = new Date();
    const [{ count }] = await this.prisma.$transaction([
      this.prisma.tableSession.updateMany({
        where: { id, restaurantId, closedAt: null },
        data: { closedAt: now, openTableKey: null },
      }),
      this.prisma.guestCheck.updateMany({
        where: { tableSessionId: id, closedAt: null, tableSession: { restaurantId } },
        data: { closedAt: now },
      }),
    ]);
    return count > 0;
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

  private async findCheckForRetry(restaurantId: string, id: string): Promise<GuestCheck | null> {
    const existing = await this.prisma.guestCheck.findUnique({
      where: { id },
      select: { id: true, name: true, tableSession: { select: { restaurantId: true } } },
    });
    if (!existing) return null;
    if (existing.tableSession.restaurantId !== restaurantId) {
      throw new ConflictException('Identificador de comanda já utilizado');
    }
    return { id: existing.id, name: existing.name };
  }

  private async publishChange(restaurantId: string): Promise<void> {
    this.realtime.publish(
      restaurantId,
      REALTIME_EVENTS.tableSessionsChanged,
      await this.listOpen(restaurantId),
    );
  }
}
