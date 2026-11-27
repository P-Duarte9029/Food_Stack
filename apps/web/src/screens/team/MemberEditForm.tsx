import { useId, useState, type FormEvent } from 'react';
import { z } from 'zod';
import {
  MIN_PASSWORD_LENGTH,
  ROLE_LABEL,
  staffRoleSchema,
  updateUserProfileInputSchema,
  userSummarySchema,
  type StaffRole,
  type UserSummary,
} from '@food-stack/shared';
import { request } from '../../api/client';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';
const fieldClasses = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 ${focusRing}`;
const ROLES = staffRoleSchema.options;

/** Só o que mudou; senha em branco significa manter a atual. */
const changesOf = (
  member: UserSummary,
  draft: { name: string; email: string; role: StaffRole; password: string },
): z.input<typeof updateUserProfileInputSchema> => ({
  ...(draft.name.trim() !== member.name && { name: draft.name }),
  ...(draft.email.trim().toLowerCase() !== member.email && { email: draft.email }),
  ...(draft.role !== member.role && { role: draft.role }),
  ...(draft.password !== '' && { password: draft.password }),
});

export function MemberEditForm({
  member,
  basePath,
  onSaved,
  onCancel,
}: {
  member: UserSummary;
  basePath: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const uid = useId();
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  const [role, setRole] = useState<StaffRole>(staffRoleSchema.catch('waiter').parse(member.role));
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sessionsEnd = role !== member.role || password !== '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = updateUserProfileInputSchema.safeParse(changesOf(member, { name, email, role, password }));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await request('PATCH', `${basePath}/${member.id}`, userSummarySchema, parsed.data);
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar o usuário.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="grid w-full gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor={`${uid}-nome`} className="text-sm font-medium text-slate-700">
          Nome
        </label>
        <input
          id={`${uid}-nome`}
          type="text"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClasses}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-papel`} className="text-sm font-medium text-slate-700">
          Papel
        </label>
        <select
          id={`${uid}-papel`}
          value={role}
          onChange={(event) => setRole(staffRoleSchema.parse(event.target.value))}
          className={fieldClasses}
        >
          {ROLES.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABEL[option]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-email`} className="text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClasses}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-senha`} className="text-sm font-medium text-slate-700">
          Nova senha (opcional, mín. {MIN_PASSWORD_LENGTH} caracteres)
        </label>
        <input
          id={`${uid}-senha`}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={fieldClasses}
        />
      </div>
      <div className="sm:col-span-2">
        {sessionsEnd && (
          <p className="mb-3 text-sm text-slate-700">
            Trocar o papel ou a senha encerra as sessões abertas deste usuário. Informe a nova senha
            pessoalmente.
          </p>
        )}
        {error && (
          <p role="alert" className="mb-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-600 sm:flex-none ${focusRing}`}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className={`min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 disabled:opacity-40 ${focusRing}`}
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}
