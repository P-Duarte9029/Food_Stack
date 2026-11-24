import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { z } from 'zod';
import {
  MIN_PASSWORD_LENGTH,
  ROLE_LABEL,
  createUserInputSchema,
  roleSchema,
  userSummarySchema,
  type Role,
  type UserSummary,
} from '@food-stack/shared';
import { request } from '../api/client';
import { useAuth } from '../auth/auth-store';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';
const fieldClasses = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 ${focusRing}`;
const usersSchema = z.array(userSummarySchema);
const ROLES = roleSchema.options;

const messageOf = (failure: unknown, fallback: string): string =>
  failure instanceof Error ? failure.message : fallback;

export function TeamSection() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<readonly UserSummary[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('waiter');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await request('GET', '/users', usersSchema));
    } catch (failure) {
      setError(messageOf(failure, 'Não foi possível carregar a equipe.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = createUserInputSchema.safeParse({ name, email, password, role });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      setCreated(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await request('POST', '/users', userSummarySchema, parsed.data);
      setCreated(parsed.data.name);
      setName('');
      setEmail('');
      setPassword('');
      await load();
    } catch (failure) {
      setError(messageOf(failure, 'Não foi possível criar o usuário.'));
      setCreated(null);
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (id: string, active: boolean) => {
    setError(null);
    setCreated(null);
    try {
      await request('PATCH', `/users/${id}`, userSummarySchema, { active });
      setConfirming(null);
      await load();
    } catch (failure) {
      setError(messageOf(failure, 'Não foi possível atualizar o usuário.'));
    }
  };

  return (
    <section aria-labelledby="equipe-titulo" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="equipe-titulo" className="text-lg font-bold">
        Equipe
      </h2>
      <form onSubmit={(event) => void submit(event)} className="mt-3 grid gap-3 sm:grid-cols-2" noValidate>
        <div>
          <label htmlFor="equipe-nome" className="text-sm font-medium text-slate-700">
            Nome
          </label>
          <input
            id="equipe-nome"
            type="text"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="equipe-papel" className="text-sm font-medium text-slate-700">
            Papel
          </label>
          <select
            id="equipe-papel"
            value={role}
            onChange={(event) => setRole(roleSchema.parse(event.target.value))}
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
          <label htmlFor="equipe-email" className="text-sm font-medium text-slate-700">
            E-mail
          </label>
          <input
            id="equipe-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="equipe-senha" className="text-sm font-medium text-slate-700">
            Senha inicial (mín. {MIN_PASSWORD_LENGTH} caracteres)
          </label>
          <input
            id="equipe-senha"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClasses}
          />
        </div>
        <div className="sm:col-span-2">
          {error && (
            <p role="alert" className="mb-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {created && (
            <p role="status" className="mb-3 text-sm font-medium text-emerald-800">
              Usuário {created} criado. Informe a senha inicial pessoalmente.
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-600 sm:w-auto ${focusRing}`}
          >
            <UserPlus aria-hidden className="size-5" />
            {saving ? 'Criando...' : 'Criar usuário'}
          </button>
        </div>
      </form>

      <ul className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200">
        {users.map((member) => {
          const isMe = member.id === me?.id;
          return (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-slate-900">
                  {member.name}
                  {isMe && <span className="ml-2 text-sm font-normal text-slate-600">(você)</span>}
                </p>
                <p className="break-all text-sm text-slate-600">
                  {member.email} · {ROLE_LABEL[member.role]}
                  {!member.active && ' · Desativado'}
                </p>
              </div>
              {!isMe &&
                (confirming === member.id ? (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void setActive(member.id, false)}
                      className={`min-h-11 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white ${focusRing}`}
                    >
                      Confirmar desativação
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className={`min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 ${focusRing}`}
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => (member.active ? setConfirming(member.id) : void setActive(member.id, true))}
                    className={`min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold ${
                      member.active ? 'text-red-700' : 'text-slate-800'
                    } ${focusRing}`}
                  >
                    {member.active ? 'Desativar' : 'Reativar'}
                  </button>
                ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
