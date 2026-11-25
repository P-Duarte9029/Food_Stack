import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  REALTIME_EVENTS,
  nextOrderStatus,
  type CreateOrderInput,
  type Order,
  type Role,
} from '@food-stack/shared';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { toOrder } from './order.mapper';

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

const orderInclude = {
  items: { select: { menuItemId: true, name: true, quantity: true }, orderBy: { name: 'asc' } },
  tableSession: { select: { customerName: true } },
  check: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(restaurantId: string): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
      include: orderInclude,
    });
    return records.map(toOrder);
  }

  async create(restaurantId: string, userId: string, input: CreateOrderInput): Promise<Order> {
    if (input.id) {
      const existing = await this.findForRetry(restaurantId, input.id);
      if (existing) return existing;
    }

    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: { tablesCount: true },
    });
    if (input.table > restaurant.tablesCount) {
      throw new BadRequestException('Mesa inexistente');
    }

    const target = await this.resolveTarget(restaurantId, input);

    const requested = new Map<string, number>();
    for (const item of input.items) {
      requested.set(item.menuItemId, (requested.get(item.menuItemId) ?? 0) + item.quantity);
    }
    const menuItems = await this.prisma.menuItem.findMany({
      where: { restaurantId, id: { in: [...requested.keys()] } },
      select: { id: true, name: true },
    });
    if (menuItems.length !== requested.size) {
      throw new BadRequestException('Item inexistente no cardápio');
    }

    let order: Order;
    try {
      order = toOrder(
        await this.prisma.order.create({
          data: {
            id: input.id,
            restaurantId,
            table: input.table,
            tableSessionId: target.tableSessionId,
            checkId: target.checkId,
            createdById: userId,
            items: {
              create: menuItems.map((menuItem) => ({
                menuItemId: menuItem.id,
                name: menuItem.name,
                quantity: requested.get(menuItem.id) ?? 0,
              })),
            },
          },
          include: orderInclude,
        }),
      );
    } catch (error) {
      // Dois reenvios simultâneos do mesmo pedido: o segundo apenas devolve o já criado.
      const existing =
        input.id && isUniqueViolation(error) ? await this.findForRetry(restaurantId, input.id) : null;
      if (existing) return existing;
      throw error;
    }
    this.realtime.publish(restaurantId, REALTIME_EVENTS.orderCreated, order);
    return order;
  }

  /** Mesa aberta e comanda do pedido; mesas abertas antes das comandas ficam sem comanda. */
  private async resolveTarget(
    restaurantId: string,
    input: CreateOrderInput,
  ): Promise<{ tableSessionId: string; checkId: string | null }> {
    const session = await this.prisma.tableSession.findFirst({
      where: {
        restaurantId,
        closedAt: null,
        table: input.table,
        ...(input.tableSessionId ? { id: input.tableSessionId } : {}),
      },
      select: { id: true, checks: { where: { closedAt: null }, select: { id: true } } },
    });
    if (!session) throw new BadRequestException('Abra a mesa antes de enviar o pedido');

    if (input.checkId) {
      if (!session.checks.some((check) => check.id === input.checkId)) {
        throw new BadRequestException('A comanda não está aberta');
      }
      return { tableSessionId: session.id, checkId: input.checkId };
    }
    if (session.checks.length > 1) throw new BadRequestException('Informe a comanda do pedido');
    return { tableSessionId: session.id, checkId: session.checks[0]?.id ?? null };
  }

  private async findForRetry(restaurantId: string, id: string): Promise<Order | null> {
    const existing = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!existing) return null;
    if (existing.restaurantId !== restaurantId) throw new ConflictException('Identificador de pedido já utilizado');
    return toOrder(existing);
  }

  async advance(restaurantId: string, id: string): Promise<Order> {
    const current = await this.prisma.order.findFirst({
      where: { id, restaurantId },
      select: { status: true },
    });
    if (!current) throw new NotFoundException('Pedido não encontrado');

    const next = nextOrderStatus(current.status);
    if (!next) {
      throw new ConflictException(
        current.status === 'delivered' ? 'O pedido já foi entregue' : 'O pedido já está pronto',
      );
    }

    const { count } = await this.prisma.order.updateMany({
      where: { id, restaurantId, status: current.status },
      data: { status: next },
    });
    if (count === 0) throw new ConflictException('O status do pedido mudou, atualize a tela');

    const record = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: orderInclude,
    });
    const order = toOrder(record);
    this.realtime.publish(restaurantId, REALTIME_EVENTS.orderUpdated, order);
    return order;
  }

  /** Marca como entregue um pedido pronto. Só quem criou o pedido (ou o gerente) pode. */
  async deliver(
    restaurantId: string,
    user: { id: string; role: Role },
    id: string,
  ): Promise<Order> {
    const current = await this.prisma.order.findFirst({
      where: { id, restaurantId },
      select: { status: true, createdById: true },
    });
    if (!current) throw new NotFoundException('Pedido não encontrado');
    if (user.role !== 'manager' && current.createdById !== user.id) {
      throw new ForbiddenException('Só quem criou o pedido pode marcá-lo como entregue');
    }

    if (current.status === 'delivered') return this.findOrder(id); // reenvio: já entregue
    if (current.status !== 'ready') throw new ConflictException('O pedido ainda não está pronto');

    const { count } = await this.prisma.order.updateMany({
      where: { id, restaurantId, status: 'ready' },
      data: { status: 'delivered' },
    });
    if (count === 0) throw new ConflictException('O status do pedido mudou, atualize a tela');

    const order = await this.findOrder(id);
    this.realtime.publish(restaurantId, REALTIME_EVENTS.orderUpdated, order);
    return order;
  }

  private async findOrder(id: string): Promise<Order> {
    return toOrder(
      await this.prisma.order.findUniqueOrThrow({ where: { id }, include: orderInclude }),
    );
  }
}
