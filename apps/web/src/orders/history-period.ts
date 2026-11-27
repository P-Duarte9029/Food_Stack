import type { Order } from '@food-stack/shared';

type Dated = Pick<Order, 'createdAt'>;

const pad = (value: number): string => String(value).padStart(2, '0');

/** Dia no fuso do navegador, "AAAA-MM-DD": o mesmo formato do input de data e ordenável como texto. */
export const localDayKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const orderDayKey = (order: Dated): string => localDayKey(new Date(order.createdAt));

/** Intervalo inclusivo nas duas pontas; data vazia deixa aquela ponta em aberto. */
export const filterByPeriod = <T extends Dated>(orders: readonly T[], from: string, to: string): T[] =>
  orders.filter((order) => {
    const day = orderDayKey(order);
    return (from === '' || day >= from) && (to === '' || day <= to);
  });

export const isInvertedPeriod = (from: string, to: string): boolean =>
  from !== '' && to !== '' && from > to;

export interface DayGroup<T> {
  day: string;
  orders: T[];
}

/** Um grupo por dia, do mais recente para o mais antigo; dentro do dia, o pedido mais novo primeiro. */
export const groupByDay = <T extends Dated>(orders: readonly T[]): DayGroup<T>[] => {
  const groups = new Map<string, T[]>();
  for (const order of [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const day = orderDayKey(order);
    const group = groups.get(day);
    if (group) group.push(order);
    else groups.set(day, [order]);
  }
  return [...groups].map(([day, dayOrders]) => ({ day, orders: dayOrders }));
};
