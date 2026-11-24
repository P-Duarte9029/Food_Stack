import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  REALTIME_EVENTS,
  nextOrderStatus,
  type CreateOrderInput,
  type Order,
} from '@food-stack/shared';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { DEFAULT_RESTAURANT_ID } from '../restaurant/default-restaurant';
import { toOrder } from './order.mapper';

const orderInclude = {
  items: { select: { menuItemId: true, name: true, quantity: true }, orderBy: { name: 'asc' } },
} as const;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: { restaurantId: DEFAULT_RESTAURANT_ID },
      orderBy: { createdAt: 'asc' },
      include: orderInclude,
    });
    return records.map(toOrder);
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({
      where: { id: DEFAULT_RESTAURANT_ID },
      select: { tablesCount: true },
    });
    if (input.table > restaurant.tablesCount) {
      throw new BadRequestException('Mesa inexistente');
    }

    const requested = new Map<string, number>();
    for (const item of input.items) {
      requested.set(item.menuItemId, (requested.get(item.menuItemId) ?? 0) + item.quantity);
    }
    const menuItems = await this.prisma.menuItem.findMany({
      where: { restaurantId: DEFAULT_RESTAURANT_ID, id: { in: [...requested.keys()] } },
      select: { id: true, name: true },
    });
    if (menuItems.length !== requested.size) {
      throw new BadRequestException('Item inexistente no cardápio');
    }

    const record = await this.prisma.order.create({
      data: {
        restaurantId: DEFAULT_RESTAURANT_ID,
        table: input.table,
        items: {
          create: menuItems.map((menuItem) => ({
            menuItemId: menuItem.id,
            name: menuItem.name,
            quantity: requested.get(menuItem.id) ?? 0,
          })),
        },
      },
      include: orderInclude,
    });
    const order = toOrder(record);
    this.realtime.publish(DEFAULT_RESTAURANT_ID, REALTIME_EVENTS.orderCreated, order);
    return order;
  }

  async advance(id: string): Promise<Order> {
    const current = await this.prisma.order.findFirst({
      where: { id, restaurantId: DEFAULT_RESTAURANT_ID },
      select: { status: true },
    });
    if (!current) throw new NotFoundException('Pedido não encontrado');

    const next = nextOrderStatus(current.status);
    if (!next) throw new ConflictException('O pedido já está pronto');

    const { count } = await this.prisma.order.updateMany({
      where: { id, restaurantId: DEFAULT_RESTAURANT_ID, status: current.status },
      data: { status: next },
    });
    if (count === 0) throw new ConflictException('O status do pedido mudou, atualize a tela');

    const record = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: orderInclude,
    });
    const order = toOrder(record);
    this.realtime.publish(DEFAULT_RESTAURANT_ID, REALTIME_EVENTS.orderUpdated, order);
    return order;
  }
}
