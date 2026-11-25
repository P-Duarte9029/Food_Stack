import { BellRing, X } from 'lucide-react';
import { dismissNotice, useNotices } from '../notifications/notices-store';

/** Avisos temporários no topo da tela. A região é anunciada por leitores de tela. */
export function NoticeToasts() {
  const notices = useNotices();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-30 flex flex-col items-center gap-2 px-4"
    >
      {notices.map((notice) => (
        <div
          key={notice.id}
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 shadow-lg"
        >
          <BellRing aria-hidden className="size-6 shrink-0 text-emerald-800" />
          <p className="min-w-0 flex-1 break-words text-sm text-emerald-950">
            <span className="block font-bold">{notice.title}</span>
            {notice.message}
          </p>
          <button
            type="button"
            aria-label="Dispensar aviso"
            onClick={() => dismissNotice(notice.id)}
            className="grid size-11 shrink-0 place-items-center rounded-lg text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
