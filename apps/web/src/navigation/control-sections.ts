export type ControlSection = 'cardapio' | 'equipe' | 'historico';

export const controlSectionFromHash = (hash: string): ControlSection => {
  if (hash.startsWith('#/controle/equipe')) return 'equipe';
  if (hash.startsWith('#/controle/historico')) return 'historico';
  return 'cardapio';
};
