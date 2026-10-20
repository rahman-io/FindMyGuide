import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, formatDate } from '../src/utils/html.js';

test('untrusted text is escaped before insertion into a view template', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

test('selected booking dates are shown in the same local calendar day', () => {
  assert.equal(formatDate('2026-10-15'), 'Thursday, October 15, 2026');
});
