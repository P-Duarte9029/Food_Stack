import { describe, expect, it } from 'vitest';
import {
  filterByPeriod,
  groupByDay,
  isInvertedPeriod,
  localDayKey,
  orderDayKey,
} from './history-period';

// Datas montadas no fuso local, como o app as lê, para o teste valer em qualquer fuso.
const at = (month: number, day: number, hour: number, minute = 0) => ({
  createdAt: new Date(2026, month - 1, day, hour, minute).toISOString(),
});

describe('localDayKey', () => {
  it('formata o dia local como AAAA-MM-DD com zeros à esquerda', () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('usa o dia local, não o UTC, para pedidos perto da meia-noite', () => {
    expect(orderDayKey(at(11, 27, 23, 30))).toBe('2026-11-27');
    expect(orderDayKey(at(11, 28, 0, 15))).toBe('2026-11-28');
  });
});

describe('filterByPeriod', () => {
  const orders = [at(11, 25, 12), at(11, 26, 9), at(11, 27, 23, 59), at(11, 28, 0, 1)];

  it('inclui o primeiro e o último dia do período', () => {
    expect(filterByPeriod(orders, '2026-11-26', '2026-11-27')).toEqual([orders[1], orders[2]]);
  });

  it('um único dia traz só os pedidos daquele dia', () => {
    expect(filterByPeriod(orders, '2026-11-27', '2026-11-27')).toEqual([orders[2]]);
  });

  it('data vazia deixa a ponta em aberto', () => {
    expect(filterByPeriod(orders, '', '2026-11-26')).toEqual([orders[0], orders[1]]);
    expect(filterByPeriod(orders, '2026-11-27', '')).toEqual([orders[2], orders[3]]);
    expect(filterByPeriod(orders, '', '')).toEqual(orders);
  });
});

describe('isInvertedPeriod', () => {
  it('só é invertido quando as duas datas existem e a inicial vem depois', () => {
    expect(isInvertedPeriod('2026-11-28', '2026-11-27')).toBe(true);
    expect(isInvertedPeriod('2026-11-27', '2026-11-27')).toBe(false);
    expect(isInvertedPeriod('', '2026-11-27')).toBe(false);
    expect(isInvertedPeriod('2026-11-28', '')).toBe(false);
  });
});

describe('groupByDay', () => {
  it('separa por dia, do mais recente ao mais antigo, e ordena os pedidos dentro do dia', () => {
    const early = at(11, 26, 9);
    const late = at(11, 26, 20);
    const next = at(11, 27, 8);

    const groups = groupByDay([early, next, late]);

    expect(groups.map((group) => group.day)).toEqual(['2026-11-27', '2026-11-26']);
    expect(groups[0]?.orders).toEqual([next]);
    expect(groups[1]?.orders).toEqual([late, early]);
  });

  it('sem pedidos, sem grupos', () => {
    expect(groupByDay([])).toEqual([]);
  });
});
