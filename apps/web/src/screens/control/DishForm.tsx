import { useState, type FormEvent, type ReactNode } from 'react';
import {
  canonicalCategory,
  createMenuItemInputSchema,
  sameCategory,
  type CreateMenuItemInput,
} from '@food-stack/shared';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';
const fieldClasses = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 ${focusRing}`;

const parseSizes = (text: string): string[] =>
  text
    .split(',')
    .map((size) => size.trim())
    .filter((size) => size !== '');

export function DishForm({
  idPrefix,
  categories,
  initial,
  submitLabel,
  submitIcon,
  clearOnSubmit = false,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  categories: readonly string[];
  initial?: CreateMenuItemInput;
  submitLabel: string;
  submitIcon: ReactNode;
  clearOnSubmit?: boolean;
  onSubmit: (input: CreateMenuItemInput) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [sizesText, setSizesText] = useState(initial?.sizes.join(', ') ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = createMenuItemInputSchema.safeParse({
      name,
      category,
      sizes: parseSizes(sizesText),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    onSubmit({ ...parsed.data, category: canonicalCategory(categories, parsed.data.category) });
    setError(null);
    if (clearOnSubmit) {
      setName('');
      setSizesText('');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div>
        <label htmlFor={`${idPrefix}-nome`} className="text-sm font-medium text-slate-700">
          Nome do prato
        </label>
        <input
          id={`${idPrefix}-nome`}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClasses}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-categoria`} className="text-sm font-medium text-slate-700">
          Categoria
        </label>
        <input
          id={`${idPrefix}-categoria`}
          type="text"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={fieldClasses}
        />
        {categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Categorias existentes">
            {categories.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={sameCategory(category, option)}
                onClick={() => setCategory(option)}
                className={`min-h-11 max-w-full break-words rounded-full border px-3 text-sm font-medium ${focusRing} ${
                  sameCategory(category, option)
                    ? 'border-brand-700 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-800'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-tamanhos`} className="text-sm font-medium text-slate-700">
          Tamanhos (opcional)
        </label>
        <input
          id={`${idPrefix}-tamanhos`}
          type="text"
          value={sizesText}
          onChange={(event) => setSizesText(event.target.value)}
          aria-describedby={`${idPrefix}-tamanhos-ajuda`}
          className={fieldClasses}
        />
        <p id={`${idPrefix}-tamanhos-ajuda`} className="mt-1 text-sm text-slate-600">
          Separe por vírgula, ex.: Pequena, Média, Grande. Deixe vazio se o prato não tem tamanhos.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className={`flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 ${focusRing} ${onCancel ? '' : 'w-full sm:w-auto'}`}
        >
          {submitIcon}
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`min-h-11 rounded-lg border border-slate-300 px-4 font-semibold text-slate-800 ${focusRing}`}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
