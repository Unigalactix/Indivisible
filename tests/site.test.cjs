const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'docs');
const pages = ['index.html', 'foundations.html', 'explore.html', 'advanced.html', 'playground.html', 'resources.html', 'applications.html', 'visuals.html', 'research.html'];
const documents = new Map(pages.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));

test('all learning pages have unique IDs, one main heading, and navigation landmarks', () => {
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

test('all HTML lives in the web root and all pages expose the complete curriculum navigation', () => {
    assert.ok(fs.existsSync(path.join(root, '.nojekyll')));
    assert.equal(fs.readdirSync(path.resolve(root, '..')).filter(file => file.endsWith('.html')).length, 0);
    assert.equal(fs.readdirSync(root).filter(file => file.endsWith('.html')).length, pages.length);
    for (const [file, html] of documents) {
        const navigation = html.match(/<nav aria-label="Main navigation">([\s\S]*?)<\/nav>/)?.[1];
        for (const target of pages.filter(page => page !== 'playground.html')) {
            assert.ok(navigation.includes(`href="${target}"`), `${file}: navigation lacks ${target}`);
        }
        assert.ok(html.includes('href="playground.html"'), `${file}: lab is unreachable`);
    }
});

test('each interactive lesson has a label, error region, result container, and correct script order', () => {
    const forms = {
        'foundations.html': ['factorForm', 'euclidForm'],
        'advanced.html': ['modularForm', 'zetaForm', 'progressionForm'],
        'applications.html': ['rsaForm'],
        'visuals.html': ['distributionForm', 'windowForm', 'spiralForm', 'goldbachForm'],
        'research.html': ['intervalForm']
    };
    for (const [file, ids] of Object.entries(forms)) {
        const html = documents.get(file);
        assert.ok(html.indexOf('scripts/math.js') < html.indexOf('scripts/lessons-math.js'));
        assert.ok(html.indexOf('scripts/lessons-math.js') < html.indexOf('scripts/lessons.js'));
        for (const id of ids) {
            assert.ok(html.includes(`id="${id}"`));
            assert.match(html, new RegExp(`id="${id}Error"[^>]+role="alert"`));
            assert.ok(html.includes(`id="${id}Output"`));
        }
        for (const [, controlId] of html.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"/g)) {
            assert.ok(html.includes(`for="${controlId}"`), `${file}: ${controlId} needs a label`);
        }
    }
});

test('research notes keep publication status, limitations, dates and primary sources visible', () => {
    const html = documents.get('research.html');
    for (const required of ['guth-maynard', 'gafni-tao', 'gpu-record', 'non-mersenne']) {
        assert.ok(html.includes(`id="${required}"`));
    }
    for (const host of ['annals.math.princeton.edu', 'msp.org', 'www.mersenne.org', 't5k.org']) {
        assert.ok(html.includes(`https://${host}/`));
    }
    assert.ok(html.includes('What it does not prove'));
    assert.ok(html.includes('May 12, 2026'));
    assert.ok(html.includes('almost all'));
});
