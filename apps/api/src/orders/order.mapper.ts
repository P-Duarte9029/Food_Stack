import type { Order, OrderStatus } from '@food-stack/shared';

export interface OrderRecord {
  id: string;
  table: number;
  status: OrderStatus;
  createdAt: Date;
  tableSession?: { customerName: string } | null;
  check?: { name: string } | null;
  items: ReadonlyArray<{ menuItemId: string; name: string; quantity: number }>;
}

export const toOrder = (record: OrderRecord): Order => ({
  id: record.id,
  table: record.table,
  status: record.status,
  createdAt: record.createdAt.toISOString(),
  customerName: record.check?.name ?? record.tableSession?.customerName ?? null,
  items: record.items.map(({ menuItemId, name, quantity }) => ({ menuItemId, name, quantity })),
});
