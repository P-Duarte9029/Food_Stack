import { CircleCheck, CookingPot, Inbox, type LucideIcon } from 'lucide-react';
import type { OrderStatus } from '@food-stack/shared';
import { STATUS_LABEL } from '../orders/status';

const STATUS_STYLE: Record<OrderStatus, { icon: LucideIcon; classes: string }> = {
  placed: { icon: Inbox, classes: 'bg-sky-100 text-sky-900' },
  in_preparation: { icon: CookingPot, classes: 'bg-amber-100 text-amber-900' },
  ready: { icon: CircleCheck, classes: 'bg-emerald-100 text-emerald-900' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { icon: Icon, classes } = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      <Icon aria-hidden className="size-3.5" />
      {STATUS_LABEL[status]}
    </span>
  );
}
