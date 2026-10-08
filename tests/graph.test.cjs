const { test } = require('node:test');
const assert = require('node:assert/strict');
const graph = require('../docs/scripts/graph-math.js');

function prime(n) {
    if (n < 2) return false;
    for (let p = 2; p * p <= n; p++) if (n % p === 0) return false;
    return true;
}
function gcd(a, b) {
    return Array.from({ length: Math.min(a, b) }, (_, i) => i + 1).filter(d => a % d === 0 && b % d === 0).at(-1);
}

test('all bounded graph relationships agree with independent definitions', () => {
    for (const limit of [12, 24, 36, 48]) {
        for (const relation of ['factor', 'shared', 'gap']) {
            const data = graph.graph(limit, relation);
            assert.equal(data.nodes.length, limit);
            assert.equal(data.nodes[0].kind, 'unit');
            data.nodes.forEach(node => {
                assert.equal(node.factors.reduce((a, b) => a * b, 1), node.value);
                assert.ok(node.factors.every(prime));
                assert.equal(node.kind, node.value === 1 ? 'unit' : prime(node.value) ? 'prime' : 'composite');
            });
            const expected = [];
            for (let a = 1; a <= limit; a++) {
                for (let b = a + 1; b <= limit; b++) {
                    const match = relation === 'factor' ? b % a === 0 && prime(b / a)
                        : relation === 'shared' ? gcd(a, b) > 1
                            : prime(a) && prime(b) && !Array.from({ length: b - a - 1 }, (_, i) => a + i + 1).some(prime);
                    if (match) expected.push(`${a}:${b}`);
                }
            }
            assert.deepEqual(data.edges.map(e => `${e.from}:${e.to}`).sort(), expected.sort());
            assert.equal(new Set(data.edges.map(e => `${e.from}:${e.to}`)).size, data.edges.length);
            data.edges.forEach(edge => {
                assert.equal(edge.weight, relation === 'factor' ? edge.to / edge.from : relation === 'shared' ? gcd(edge.from, edge.to) : edge.to - edge.from);
            });
        }
    }
});

test('graph bounds, invalid relationships and node values fail explicitly', () => {
    for (const limit of [0, 11, 49, NaN, 12.1]) assert.throws(() => graph.graph(limit), RangeError);
    assert.throws(() => graph.graph(12, 'unknown'), RangeError);
    for (const value of [0, 49, Infinity, 4.5]) assert.throws(() => graph.factors(value), RangeError);
    assert.throws(() => graph.challenge('unknown', 12), RangeError);
    assert.throws(() => graph.challenge('sweep', 12, -1), RangeError);
    assert.throws(() => graph.move(graph.challenge('sweep', 12), 13), RangeError);
});

test('shortest paths allow reverse traversal, omit the unit on request, and detect isolation', () => {
    const data = graph.graph(12);
    assert.deepEqual(graph.shortestPath(data, 2, 9, true), [2, 6, 3, 9]);
    assert.deepEqual(graph.shortestPath(data, 9, 2, true), [9, 3, 6, 2]);
    assert.equal(graph.shortestPath(data, 11, 9, true), null);
    assert.equal(graph.shortestPath(data, 1, 9, true), null);
    assert.deepEqual(graph.shortestPath(data, 11, 11), [11]);
    assert.deepEqual(graph.shortestPath(data, 1, 4), [1, 2, 4]);
    // Independent all-pairs distance matrix verifies every returned route.
    const distance = Array.from({ length: 13 }, (_, i) => Array.from({ length: 13 }, (_, j) => i === j ? 0 : Infinity));
    data.edges.filter(e => e.from !== 1).forEach(e => { distance[e.from][e.to] = 1; distance[e.to][e.from] = 1; });
    for (let k = 2; k <= 12; k++) for (let a = 2; a <= 12; a++) for (let b = 2; b <= 12; b++) {
        distance[a][b] = Math.min(distance[a][b], distance[a][k] + distance[k][b]);
    }
    for (let a = 2; a <= 12; a++) for (let b = 2; b <= 12; b++) {
        const path = graph.shortestPath(data, a, b, true);
        assert.equal(path ? path.length - 1 : Infinity, distance[a][b]);
    }
});

test('prime sweep rejects unit and composites, counts unique primes and stops scoring after a win', () => {
    let state = graph.challenge('sweep', 12);
    const original = structuredClone(state);
    let result = graph.move(state, 1);
    assert.equal(result.accepted, false);
    assert.match(result.message, /unit/);
    assert.deepEqual(state, original, 'Moves must not mutate the previous state');
    state = graph.move(result.state, 4).state;
    assert.equal(state.mistakes, 2);
    state = graph.move(state, 2).state;
    const duplicate = graph.move(state, 2);
    assert.equal(duplicate.state.found.length, 1);
    assert.equal(duplicate.state.mistakes, 2);
    for (const value of [3, 5, 7, 11]) state = graph.move(state, value).state;
    assert.equal(state.status, 'won');
    assert.equal(graph.score(state), 140);
    assert.deepEqual(graph.move(state, 2).state, state);
});

test('factor forge supports repeated primes and rejects overshooting or incompatible factors', () => {
    let state = graph.challenge('forge', 12);
    assert.equal(state.target, 8);
    state = graph.move(state, 3).state;
    assert.equal(state.product, 1);
    state = graph.move(state, 4).state;
    assert.equal(state.product, 1);
    for (const p of [2, 2, 2]) state = graph.move(state, p).state;
    assert.equal(state.product, 8);
    assert.equal(state.status, 'won');
    assert.deepEqual(state.moves, [2, 2, 2]);
    assert.equal(graph.score(state), 120);
});

test('every generated challenge is solvable and path objectives rotate', () => {
    for (const limit of [12, 24, 36, 48]) {
        for (let variant = 0; variant < 20; variant++) {
            for (const mode of ['forge', 'path']) {
                let state = graph.challenge(mode, limit, variant);
                const moves = mode === 'forge' ? graph.factors(state.target)
                    : graph.shortestPath(graph.graph(limit), state.start, state.target, true).slice(1);
                moves.forEach(value => { state = graph.move(state, value).state; });
                assert.equal(state.status, 'won');
                assert.ok(graph.score(state) >= 100);
            }
        }
    }
    assert.notEqual(graph.challenge('path', 36, 0).target, graph.challenge('path', 36, 1).target);
});

test('path quests reject jumps and unit shortcuts, with no points for loops', () => {
    let state = graph.challenge('path', 12);
    state = graph.move(state, 9).state;
    state = graph.move(state, 1).state;
    assert.deepEqual(state.moves, [2]);
    assert.equal(state.mistakes, 2);
    for (const value of [6, 2, 6, 3, 9]) state = graph.move(state, value).state;
    assert.equal(state.status, 'won');
    assert.equal(state.best, 3);
    assert.equal(graph.score(state), 80);
    const fresh = graph.challenge('path', 12);
    assert.equal(graph.score(graph.move(fresh, 6).state), 0);
});

test('paused, expired and ended games cannot accept moves or change their score', () => {
    for (const mode of ['sweep', 'forge', 'path']) {
        for (const status of ['paused', 'expired', 'ended']) {
            const state = { ...graph.challenge(mode, 12), status };
            assert.deepEqual(graph.move(state, 2).state, state);
            assert.equal(graph.move(state, 2).accepted, false);
        }
    }
    const state = { ...graph.challenge('sweep', 12), mistakes: 100 };
    assert.equal(graph.score(state), 0);
});
