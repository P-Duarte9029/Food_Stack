import type { TableSession } from '@food-stack/shared';

export interface TableSessionRecord {
  id: string;
  table: number;
  customerName: string;
  openedAt: Date;
}

export const tableSessionSelect = {
  id: true,
  table: true,
  customerName: true,
  openedAt: true,
} as const;

export const toTableSession = (record: TableSessionRecord): TableSession => ({
  id: record.id,
  table: record.table,
  customerName: record.customerName,
  openedAt: record.openedAt.toISOString(),
});
