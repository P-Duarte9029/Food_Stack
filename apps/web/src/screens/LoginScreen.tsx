import { useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { loginInputSchema } from '@food-stack/shared';
import { login } from '../auth/auth-store';

const fieldClasses =
  'mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = loginInputSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(parsed.data);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível entrar.');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-brand-600">Food Stack</h1>
        <p className="mt-1 text-slate-600">Entre com a sua conta para continuar.</p>
      </div>
      <form
        onSubmit={(event) => void submit(event)}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
        noValidate
      >
        <div>
          <label htmlFor="login-email" className="text-sm font-medium text-slate-700">
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="login-senha" className="text-sm font-medium text-slate-700">
            Senha
          </label>
          <input
            id="login-senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClasses}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 font-semibold text-white active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
        >
          <LogIn aria-hidden className="size-5" />
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
