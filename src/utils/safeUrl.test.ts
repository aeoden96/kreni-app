import { describe, expect, it } from 'vitest';

import { safeUrl } from './safeUrl';

describe('safeUrl', () => {
  it('returns null for nothing to render', () => {
    expect(safeUrl(undefined)).toBeNull();
    expect(safeUrl(null)).toBeNull();
    expect(safeUrl('')).toBeNull();
  });

  it('keeps https and http URLs', () => {
    expect(safeUrl('https://zet.hr/notice')).toBe('https://zet.hr/notice');
    expect(safeUrl('http://zet.hr/notice')).toBe('http://zet.hr/notice');
  });

  it('resolves a relative path against the document', () => {
    expect(safeUrl('/privacy')).toBe(`${window.location.origin}/privacy`);
  });

  // The reason this helper exists: an announcement link lands in an anchor href.
  it('rejects script-bearing schemes', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('JavaScript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeUrl('vbscript:msgbox(1)')).toBeNull();
  });

  it('rejects a malformed URL rather than throwing', () => {
    expect(safeUrl('http://')).toBeNull();
  });
});
