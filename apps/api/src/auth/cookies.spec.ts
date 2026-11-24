import { describe, expect, it } from 'vitest';
import { readCookie } from './cookies';

describe('readCookie', () => {
  it('lê o cookie pelo nome entre vários', () => {
    expect(readCookie('a=1; fs_session=abc%3D; b=2', 'fs_session')).toBe('abc=');
  });

  it('devolve undefined quando ausente ou sem header', () => {
    expect(readCookie('a=1', 'fs_session')).toBeUndefined();
    expect(readCookie(undefined, 'fs_session')).toBeUndefined();
  });
});
