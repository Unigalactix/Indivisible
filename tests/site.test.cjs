const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'foundations.html', 'explore.html', 'advanced.html', 'playground.html', 'resources.html'];
const documents = new Map(pages.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));

test('all six pages have unique IDs, one main heading, and navigation landmarks', () => {
    for (const [file, html] of documents) {
        const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
        assert.equal(new Set(ids).size, ids.length, `${file}: duplicate IDs`);
        assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: expected one h1`);
        assert.match(html, /<html lang="en">/);
        assert.match(html, /<main id="main"/);
        assert.match(html, /aria-label="Main navigation"/);
        assert.match(html, /name="description"/);
    }
});

test('all local page, stylesheet, script, image, and anchor references resolve', () => {
    for (const [file, html] of documents) {
        for (const [, reference] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
            if (/^(?:https?:|data:|mailto:)/.test(reference)) continue;
            const [targetFile, fragment] = reference.split('#');
            const target = targetFile || file;
            assert.ok(fs.existsSync(path.join(root, target)), `${file}: missing ${reference}`);
            if (fragment) {
                assert.ok(documents.get(target)?.includes(`id="${fragment}"`), `${file}: missing anchor ${reference}`);
            }
        }
    }
});

test('algorithm tabs have associated panels and the analyzer has accessible neighbor outputs', () => {
    const explore = documents.get('explore.html');
    for (const algorithm of ['sieve', 'miller', 'aks']) {
        assert.ok(explore.includes(`aria-controls="algorithm-${algorithm}"`));
        assert.ok(explore.includes(`aria-labelledby="tab-${algorithm}"`));
    }
    const playground = documents.get('playground.html');
    assert.match(playground, /aria-labelledby="neighborsTitle"/);
    for (const id of ['previousPrime', 'nextPrime', 'previousDistance', 'nextDistance', 'neighborSpan']) {
        assert.ok(playground.includes(`id="${id}"`));
    }
    assert.match(playground, /aria-describedby="inputHelp inputError"/);
    assert.match(playground, /id="inputError"[^>]+role="alert"/);
});
