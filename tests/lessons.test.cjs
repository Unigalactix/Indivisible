const { test } = require('node:test');
const assert = require('node:assert/strict');
const lessons = require('../docs/scripts/lessons-math.js');
const math = require('../docs/scripts/math.js');

function trialPrime(n) {
    if (n < 2) return false;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
}
function gcd(a, b) {
    for (let d = Math.min(a, b); d >= 1; d--) if (a % d === 0 && b % d === 0) return d;
}

test('factor trees preserve products, prime leaves, divisor counts and totients', () => {
    for (let n = 2; n <= 300; n++) {
        const result = lessons.factorTree(n);
        function verify(node) {
            if (!node.children.length) assert.equal(trialPrime(node.value), true);
            else assert.equal(node.children.reduce((p, c) => p * c.value, 1), node.value);
            node.children.forEach(verify);
        }
        verify(result.tree);
        assert.equal(result.factors.reduce((a, b) => a * b, 1), n);
        const values = Array.from({ length: n }, (_, i) => i + 1);
        assert.equal(result.divisorCount, values.filter(d => n % d === 0).length);
        assert.equal(result.totient, values.filter(d => gcd(d, n) === 1).length);
    }
    assert.deepEqual(lessons.factorTree(84).factors, [2, 2, 3, 7]);
    assert.throws(() => lessons.factorTree(1), RangeError);
});

test('Euclidean equations and GCD/LCM invariants hold including reversed and equal inputs', () => {
    for (const [a, b] of [[252, 198], [12, 18], [18, 12], [97, 97], [1, 10000], [9999, 10000]]) {
        const result = lessons.euclid(a, b);
        result.steps.forEach(step => {
            assert.equal(step.a, step.quotient * step.b + step.remainder);
            assert.ok(step.remainder >= 0 && step.remainder < step.b);
        });
        assert.equal(result.gcd, gcd(a, b));
        assert.equal(result.gcd * result.lcm, a * b);
    }
    assert.throws(() => lessons.euclid(0, 7), RangeError);
});

test('prime count chart endpoints are exact and bounded to the documented domain', () => {
    for (const [n, count] of [[100, 25], [1000, 168], [10000, 1229], [100000, 9592]]) {
        const result = lessons.distribution(n);
        assert.equal(result.count, count);
        assert.equal(result.points.at(-1).actual, count);
        assert.equal(result.points.at(-1).x, n);
        assert.ok(result.points.length <= 201);
        assert.equal(result.estimate, n / Math.log(n));
    }
    assert.throws(() => lessons.distribution(100001), RangeError);
});

test('prime windows are inclusive 100-integer windows with correct internal gaps', () => {
    for (const start of [1, 91, 10000, 90000, 99901]) {
        const result = lessons.primeWindow(start);
        const expected = Array.from({ length: 100 }, (_, i) => start + i).filter(trialPrime);
        assert.deepEqual(result.primes, expected);
        assert.equal(result.end - result.start + 1, 100);
        assert.equal(result.gaps.length, Math.max(0, expected.length - 1));
        result.gaps.forEach(gap => assert.equal(gap.gap, gap.to - gap.from));
    }
    assert.throws(() => lessons.primeWindow(99902), RangeError);
});

test('Ulam spiral covers each cell once, remains in bounds, and highlights primes exactly', () => {
    for (const side of [3, 11, 31, 61]) {
        const points = lessons.spiral(side);
        assert.equal(points.length, side * side);
        assert.equal(new Set(points.map(p => `${p.x},${p.y}`)).size, side * side);
        points.forEach((point, i) => {
            assert.equal(point.value, i + 1);
            assert.ok(point.x >= 0 && point.x < side && point.y >= 0 && point.y < side);
            assert.equal(point.prime, trialPrime(point.value));
        });
        assert.equal(points[0].x, (side - 1) / 2);
        assert.equal(points[1].x, points[0].x + 1);
    }
    assert.throws(() => lessons.spiral(10), RangeError);
});

test('modular clocks reach m/gcd(a,m) residues and find exactly the available inverses', () => {
    for (let m = 2; m <= 12; m++) {
        for (let a = 1; a <= 20; a++) {
            const result = lessons.modular(m, a);
            assert.equal(new Set(result.residues).size, m / gcd(m, a));
            assert.equal(result.inverse !== null, gcd(m, a) === 1);
            if (result.inverse !== null) assert.equal(a * result.inverse % m, 1);
            assert.equal(result.field, trialPrime(m));
            assert.equal(result.table.length, m - 1);
        }
    }
    assert.equal(lessons.modular(8, 2).inverse, null);
    assert.equal(lessons.modular(7, 3).inverse, 5);
});

test('shared BigInt modular powers handle zero, negatives, and bounded exact results', () => {
    assert.equal(math.modularPower(3n, 6n, 7n), 1n);
    assert.equal(math.modularPower(9n, 0n, 1n), 0n);
    assert.equal(math.modularPower(-2n, 3n, 5n), 2n);
    for (let b = 0n; b <= 10n; b++) {
        for (let e = 0n; e <= 10n; e++) assert.equal(math.modularPower(b, e, 17n), b ** e % 17n);
    }
    assert.throws(() => math.modularPower(2n, -1n, 7n), RangeError);
    assert.throws(() => math.modularPower(2n, 3n, 0n), RangeError);
});

test('toy RSA round trips every residue, including non-coprime messages', () => {
    for (const [p, q] of [[3, 5], [11, 17], [61, 53]]) {
        for (let message = 0; message < p * q; message++) {
            const result = lessons.rsa(p, q, message);
            assert.equal(result.decrypted, message);
            assert.equal(result.e * result.d % result.phi, 1);
        }
    }
    assert.equal(lessons.rsa(61, 53, 65).encrypted, 2790);
    for (const args of [[11, 11, 2], [9, 17, 2], [11, 17, 187], [11, 17, -1]]) assert.throws(() => lessons.rsa(...args), RangeError);
});

test('Goldbach pairs are complete, ordered, unique and prime, including repeated primes', () => {
    for (let n = 4; n <= 2000; n += 2) {
        const expected = [];
        for (let p = 2; p <= n / 2; p++) if (trialPrime(p) && trialPrime(n - p)) expected.push([p, n - p]);
        assert.deepEqual(lessons.goldbach(n), expected);
    }
    assert.deepEqual(lessons.goldbach(10), [[3, 7], [5, 5]]);
    assert.throws(() => lessons.goldbach(9), RangeError);
});

test('residue-class chart partitions all 168 primes and explains obstructions', () => {
    for (let q = 2; q <= 20; q++) {
        for (let a = 0; a < q; a++) {
            const result = lessons.progressions(q, a);
            assert.equal(result.counts.reduce((x, y) => x + y, 0), 168);
            assert.equal(result.primes.length, result.counts[a]);
            result.primes.forEach(p => assert.equal(p % q, a));
            assert.equal(result.coprime, a !== 0 && gcd(q, a) === 1);
        }
    }
    assert.deepEqual(lessons.progressions(10, 5).primes, [5]);
    assert.throws(() => lessons.progressions(10, 10), RangeError);
});

test('Euler-product approximation respects finite-sum ordering and the series tail bound', () => {
    for (const s of [1.2, 2, 3, 4]) {
        for (const n of [10, 100, 1000]) {
            const result = lessons.zeta(s, n);
            assert.ok(result.product >= result.sum - 1e-12);
            assert.ok(result.product <= result.sum + result.tailBound + 1e-12);
            if (s === 2) {
                assert.ok(result.sum < Math.PI ** 2 / 6);
                assert.ok(result.product < Math.PI ** 2 / 6);
                assert.ok(Math.PI ** 2 / 6 - result.sum < result.tailBound);
            }
        }
    }
    assert.throws(() => lessons.zeta(1, 100), RangeError);
});

test('short-interval scale comparison has the correct exponent ratio', () => {
    for (let power = 6; power <= 18; power++) {
        const result = lessons.intervalScale(power);
        assert.ok(result.newLength < result.oldLength);
        assert.ok(Math.abs(result.newLength / result.oldLength - 10 ** (-power / 60)) < 1e-12);
    }
    assert.throws(() => lessons.intervalScale(19), RangeError);
});
