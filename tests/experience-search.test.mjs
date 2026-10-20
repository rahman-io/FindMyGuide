import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('Rinjani is discoverable from search, attractions, and the Volcano category', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
  try {
    const data = await vite.ssrLoadModule('/src/features/experiences/data.js');
    const { searchView, resultsView } = await vite.ssrLoadModule('/src/features/search/view.js');
    const rinjaniMatches = data.getExperiencesMatchingQuery('Rinjani');

    assert.ok(rinjaniMatches.some((item) => item.id === 'arena'));
    assert.ok(rinjaniMatches.some((item) => item.id === 'volcano-386938'));
    assert.ok(data.getExperiencesByCity('Lombok', 'Volcano').some((item) => item.id === 'arena'));
    assert.match(searchView(), /Mount Rinjani/);
    assert.match(searchView(), /href="#\/experience\/arena"/);
    assert.match(resultsView('Lombok', '', 'Rinjani'), /Lombok: Mount Rinjani National Park &amp; Sembalun Tour/);
    assert.match(resultsView('Lombok', 'Volcano'), /Lombok: Mount Rinjani National Park &amp; Sembalun Tour/);
  } finally {
    await vite.close();
  }
});
