import { describe, expect, it } from 'vitest';
import { controlSectionFromHash } from './control-sections';

describe('controlSectionFromHash', () => {
  it('resolve cada seção do controle', () => {
    expect(controlSectionFromHash('#/controle/equipe')).toBe('equipe');
    expect(controlSectionFromHash('#/controle/historico')).toBe('historico');
    expect(controlSectionFromHash('#/controle/cardapio')).toBe('cardapio');
  });

  it('usa mesas e cardápio como seção padrão', () => {
    expect(controlSectionFromHash('#/controle')).toBe('cardapio');
    expect(controlSectionFromHash('#/controle/qualquer-coisa')).toBe('cardapio');
  });
});
