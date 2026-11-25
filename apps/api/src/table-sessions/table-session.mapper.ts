import type { TableSession } from '@food-stack/shared';

export interface TableSessionRecord {
  id: string;
  table: number;
  customerName: string;
  openedAt: Date;
  checks: ReadonlyArray<{ id: string; name: string }>;
}

export const tableSessionSelect = {
  id: true,
  table: true,
  customerName: true,
  openedAt: true,
  checks: {
    where: { closedAt: null },
    orderBy: { openedAt: 'asc' },
    select: { id: true, name: true },
  },
} as const;

export const toTableSession = (record: TableSessionRecord): TableSession => ({
  id: record.id,
  table: record.table,
  customerName: record.customerName,
  openedAt: record.openedAt.toISOString(),
  checks: record.checks.map(({ id, name }) => ({ id, name })),
});
