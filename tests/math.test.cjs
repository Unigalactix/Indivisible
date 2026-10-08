const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MAX_INTEGER, parseInteger, sieve, getDivisors, isPrime, getPrimeNeighbors, classify } = require('../math.js');

function bruteDivisors(value) {
    const result = [];
    for (let divisor = 1; divisor <= value; divisor++) {
        if (value % divisor === 0) result.push(divisor);
    }
    return result;
}

function bigIntIsPrime(number) {
    const n = BigInt(number);
    if (n < 2n) return false;
    const bases = [2n, 3n, 5n, 7n, 11n, 13n, 17n];
    if (bases.includes(n)) return true;
    if (n % 2n === 0n) return false;
    let d = n - 1n;
    let s = 0;
    while (d % 2n === 0n) { d /= 2n; s++; }
    function power(base, exponent) {
        let result = 1n;
        while (exponent > 0n) {
            if (exponent % 2n) result = result * base % n;
            base = base * base % n;
            exponent /= 2n;
        }
        return result;
    }
    return bases.every(base => {
        let x = power(base, d);
        if (x === 1n || x === n - 1n) return true;
        for (let r = 1; r < s; r++) {
            x = x * x % n;
            if (x === n - 1n) return true;
        }
        return false;
    });
}

test('strict input validation, inclusive upper bound, and leading zeros', () => {
    for (const invalid of ['', ' ', '0', '-1', '+7', '1.2', '97abc', '1e3', '1,000', 'Infinity', 'NaN', '100000000000001', '9007199254740993']) {
        assert.throws(() => parseInteger(invalid), RangeError, invalid);
    }
    assert.equal(parseInteger('00097'), 97);
    assert.equal(parseInteger(' 1 '), 1);
    assert.equal(parseInteger(String(MAX_INTEGER)), 100_000_000_000_000);
});

test('every divisor and classification agree with brute force for 1–1000', async () => {
    for (let value = 1; value <= 1000; value++) {
        const expected = bruteDivisors(value);
        const actual = await getDivisors(value);
        assert.deepEqual(actual, expected, `Divisors of ${value}`);
        assert.equal(classify(value, actual), value === 1 ? 'Unit' : bigIntIsPrime(value) ? 'Prime' : 'Composite');
    }
});

test('sieve has the exact 25 primes through 100 and all 168 through 1000', () => {
    assert.deepEqual(sieve(100), [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]);
    const primes = sieve(1000);
    assert.equal(primes.length, 168);
    assert.equal(primes.at(-1), 997);
    assert.deepEqual(primes, Array.from({ length: 1000 }, (_, i) => i + 1).filter(bigIntIsPrime));
});

test('unit, prime squares, powers, and Fermat counterexample have no missing or duplicate divisors', async () => {
    assert.deepEqual(await getDivisors(1), [1]);
    assert.deepEqual(await getDivisors(49), [1, 7, 49]);
    assert.deepEqual(await getDivisors(1024), Array.from({ length: 11 }, (_, i) => 2 ** i));
    assert.deepEqual(await getDivisors(4294967297), [1, 641, 6700417, 4294967297]);
    assert.deepEqual(await getDivisors(999983 ** 2), [1, 999983, 999983 ** 2]);
});

test('the 100 trillion boundary has all 225 divisors in exact ascending order', async () => {
    const expected = [];
    for (let a = 0; a <= 14; a++) {
        for (let b = 0; b <= 14; b++) expected.push(2 ** a * 5 ** b);
    }
    expected.sort((a, b) => a - b);
    const actual = await getDivisors(MAX_INTEGER);
    assert.deepEqual(actual, expected);
    assert.equal(actual.length, 225);
});

test('large prime and semiprime agree with an independent BigInt primality test', async () => {
    const prime = 99_999_999_999_973;
    assert.equal(bigIntIsPrime(prime), true);
    let timerRan = false;
    setTimeout(() => { timerRan = true; }, 0);
    assert.deepEqual(await getDivisors(prime), [1, prime]);
    assert.equal(timerRan, true, 'Large computations must yield to the event loop');
    const a = 9_999_991;
    const b = 9_999_973;
    assert.equal(bigIntIsPrime(a) && bigIntIsPrime(b), true);
    assert.deepEqual(await getDivisors(a * b), [1, b, a, a * b]);
});

test('high-divisor-count integer includes every unique factor', async () => {
    const number = 96_376_119_840_000;
    const divisors = await getDivisors(number);
    let remainder = BigInt(number);
    let expectedCount = 1;
    for (let factor = 2n; factor * factor <= remainder; factor++) {
        let exponent = 0;
        while (remainder % factor === 0n) { remainder /= factor; exponent++; }
        expectedCount *= exponent + 1;
    }
    if (remainder > 1n) expectedCount *= 2;
    assert.equal(divisors.length, expectedCount);
    assert.equal(new Set(divisors).size, expectedCount);
    assert.equal(divisors[0], 1);
    assert.equal(divisors.at(-1), number);
    divisors.forEach((d, i) => {
        assert.equal(BigInt(number) % BigInt(d), 0n);
        if (i) assert.ok(d > divisors[i - 1]);
    });
});

test('cancellation interrupts long analysis and invalid numeric inputs fail explicitly', async () => {
    const controller = new AbortController();
    const work = getDivisors(99_999_999_999_973, controller.signal);
    controller.abort();
    await assert.rejects(work, { name: 'AbortError' });
    for (const value of [0, -1, 1.1, Infinity, NaN, MAX_INTEGER + 1]) {
        await assert.rejects(getDivisors(value), RangeError);
    }
});

test('the published prime-gap windows have exactly the stated primes', () => {
    assert.equal(bigIntIsPrime(370261), true);
    assert.equal(bigIntIsPrime(370373), true);
    const between = Array.from({ length: 111 }, (_, i) => 370262 + i);
    assert.equal(between.filter(bigIntIsPrime).length, 0);
    assert.equal(370373 - 370261, 112);
    assert.equal(Array.from({ length: 100 }, (_, i) => 370261 + i).filter(bigIntIsPrime).length, 1);
    assert.equal(Array.from({ length: 100 }, (_, i) => 370262 + i).filter(bigIntIsPrime).length, 0);
});

test('neighbor edge cases exclude the input itself and explain missing lower primes', async () => {
    assert.deepEqual(await getPrimeNeighbors(1), { before: null, after: 2, distanceBefore: null, distanceAfter: 1, span: null });
    assert.deepEqual(await getPrimeNeighbors(2), { before: null, after: 3, distanceBefore: null, distanceAfter: 1, span: null });
    assert.deepEqual(await getPrimeNeighbors(3), { before: 2, after: 5, distanceBefore: 1, distanceAfter: 2, span: 3 });
    assert.deepEqual(await getPrimeNeighbors(4), { before: 3, after: 5, distanceBefore: 1, distanceAfter: 1, span: 2 });
    assert.deepEqual(await getPrimeNeighbors(97), { before: 89, after: 101, distanceBefore: 8, distanceAfter: 4, span: 12 });
});

test('nearest primes and all distances match exhaustive trial division for 1–1000', async () => {
    const primes = Array.from({ length: 1100 }, (_, i) => i + 1).filter(n => bruteDivisors(n).length === 2);
    for (let value = 1; value <= 1000; value++) {
        const before = primes.filter(p => p < value).at(-1) ?? null;
        const after = primes.find(p => p > value);
        assert.deepEqual(await getPrimeNeighbors(value), {
            before, after,
            distanceBefore: before === null ? null : value - before,
            distanceAfter: after - value,
            span: before === null ? null : after - before
        }, `Neighborhood of ${value}`);
        assert.equal(isPrime(value), primes.includes(value));
    }
});

test('neighbor lookup spans a known gap and extends beyond the input limit exactly', async () => {
    assert.deepEqual(await getPrimeNeighbors(370300), { before: 370261, after: 370373, distanceBefore: 39, distanceAfter: 73, span: 112 });
    const result = await getPrimeNeighbors(MAX_INTEGER);
    assert.deepEqual(result, { before: 99999999999973, after: 100000000000031, distanceBefore: 27, distanceAfter: 31, span: 58 });
    for (let n = result.before + 1; n < MAX_INTEGER; n++) assert.equal(bigIntIsPrime(n), false);
    for (let n = MAX_INTEGER + 1; n < result.after; n++) assert.equal(bigIntIsPrime(n), false);
    assert.equal(bigIntIsPrime(result.before), true);
    assert.equal(bigIntIsPrime(result.after), true);
});

test('deterministic primality rejects strong pseudoprimes and unsafe inputs', () => {
    for (const composite of [0, 1, 341, 561, 2047, 1373653, 25326001, 3215031751, 2152302898747, 3474749660383]) {
        assert.equal(isPrime(composite), false, String(composite));
    }
    for (const value of [-1, 1.5, NaN, Infinity, 2 * MAX_INTEGER + 1]) assert.throws(() => isPrime(value), RangeError);
});

test('neighbor lookup respects cancellation and rejects out-of-range inputs', async () => {
    const controller = new AbortController();
    const pending = getPrimeNeighbors(370300, controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
    for (const value of [0, -1, 1.5, NaN, MAX_INTEGER + 1]) await assert.rejects(getPrimeNeighbors(value), RangeError);
});
