import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '../..');

describe('asset paths', () => {
  it('uses relative path for main module so GitHub Pages works', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    const scriptMatch = html.match(/<script[^>]+src="([^"]+)"/i);
    expect(scriptMatch).toBeTruthy();
    const src = scriptMatch?.[1];
    expect(src).toBeDefined();
    expect(src?.startsWith('./')).toBe(true);
  });
});
