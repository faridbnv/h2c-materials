// R3 C: local source paths never reach the public site (packages/publish/src/source-link.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicSourceLink, publicUrl, isLocalPath, PRIVATE_REFERENCE } from '../../packages/publish/src/source-link.ts';

test('a path on a machine is a private reference, never a link', () => {
  for (const u of ['/Users/farid/Documents/x.md', ' /home/a/b.pdf', '~/x.pdf', 'file:///Users/x.pdf', 'C:\\Users\\x.xlsm', 'D:/x.pdf', '\\\\server\\share\\x']) {
    assert.equal(isLocalPath(u), true, u);
    assert.deepEqual(publicSourceLink(u), { kind: 'private', label: PRIVATE_REFERENCE }, u);
    assert.equal(publicUrl(u), null, u);
  }
});

test('a web address stays a link; a missing-value word is no link', () => {
  assert.deepEqual(publicSourceLink('https://example.com/tds.pdf'), { kind: 'link', href: 'https://example.com/tds.pdf' });
  assert.equal(publicUrl('http://example.com'), 'http://example.com');
  for (const u of ['Not recorded', 'Not published', '', null, undefined]) assert.deepEqual(publicSourceLink(u), { kind: 'none' }, String(u));
});
