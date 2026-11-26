import type { Order, OrderStatus } from '@food-stack/shared';

export interface OrderRecord {
  id: string;
  table: number;
  status: OrderStatus;
  createdAt: Date;
  createdById?: string | null;
  createdBy?: { name: string } | null;
  tableSession?: { customerName: string } | null;
  check?: { name: string } | null;
  items: ReadonlyArray<{ menuItemId: string; name: string; size?: string | null; quantity: number }>;
}

export const toOrder = (record: OrderRecord): Order => ({
  id: record.id,
  table: record.table,
  status: record.status,
  createdAt: record.createdAt.toISOString(),
  customerName: record.check?.name ?? record.tableSession?.customerName ?? null,
  createdById: record.createdById ?? null,
  createdByName: record.createdBy?.name ?? null,
  items: record.items.map(({ menuItemId, name, size, quantity }) => ({
    menuItemId,
    name,
    size: size ?? null,
    quantity,
  })),
});
