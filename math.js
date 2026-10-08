const PrimeMath = (() => {
    const MAX_INTEGER = 100_000_000_000_000;
    const yieldControl = () => new Promise(resolve => setTimeout(resolve, 0));

    function validateValue(value) {
        if (!Number.isSafeInteger(value) || value < 1 || value > MAX_INTEGER) {
            throw new RangeError('The number must be an integer from 1 through 100 trillion.');
        }
    }

    function parseInteger(input) {
        if (!/^\d+$/.test(input.trim())) {
            throw new RangeError('Enter a positive whole number using digits only. Decimals, signs, commas, and exponents are not supported.');
        }
        const value = Number(input.trim());
        if (value < 1) {
            throw new RangeError('Enter a number greater than zero. Start with 1, the unit.');
        }
        if (!Number.isSafeInteger(value) || value > MAX_INTEGER) {
            throw new RangeError('Enter a number no greater than 100,000,000,000,000 (100 trillion).');
        }
        return value;
    }

    function sieve(limit) {
        const flags = Array(limit + 1).fill(true);
        flags[0] = false;
        flags[1] = false;
        for (let p = 2; p * p <= limit; p++) {
            if (!flags[p]) continue;
            for (let multiple = p * p; multiple <= limit; multiple += p) {
                flags[multiple] = false;
            }
        }
        const primes = [];
        for (let n = 2; n <= limit; n++) {
            if (flags[n]) primes.push(n);
        }
        return primes;
    }

    async function getDivisors(value, signal) {
        validateValue(value);
        signal?.throwIfAborted();
        let remaining = value;
        let candidate = 2;
        let attempts = 0;
        const factors = [];
        // Factor the shrinking remainder, rather than scan every divisor of the original.
        while (candidate <= remaining / candidate) {
            let exponent = 0;
            while (remaining % candidate === 0) {
                remaining /= candidate;
                exponent++;
            }
            if (exponent) factors.push([candidate, exponent]);
            candidate = candidate === 2 ? 3 : candidate + 2;
            if (++attempts % 25_000 === 0) {
                await yieldControl();
                signal?.throwIfAborted();
            }
        }
        if (remaining > 1) factors.push([remaining, 1]);

        const divisors = [1];
        for (const [prime, exponent] of factors) {
            const previousLength = divisors.length;
            let power = 1;
            for (let e = 1; e <= exponent; e++) {
                power *= prime;
                for (let i = 0; i < previousLength; i++) {
                    divisors.push(divisors[i] * power);
                }
            }
        }
        signal?.throwIfAborted();
        return divisors.sort((a, b) => a - b);
    }

    function isPrime(value) {
        if (!Number.isSafeInteger(value) || value < 0 || value > 2 * MAX_INTEGER) {
            throw new RangeError('Primality checks support integers from 0 through 200 trillion.');
        }
        if (value < 2) return false;
        const bases = [2, 3, 5, 7, 11, 13, 17];
        for (const prime of bases) {
            if (value === prime) return true;
            if (value % prime === 0) return false;
        }
        const n = BigInt(value);
        let d = n - 1n;
        let s = 0;
        while (d % 2n === 0n) {
            d /= 2n;
            s++;
        }
        function modularPower(base, exponent) {
            let result = 1n;
            while (exponent > 0n) {
                if (exponent % 2n) result = result * base % n;
                base = base * base % n;
                exponent /= 2n;
            }
            return result;
        }
        // These seven bases are deterministic below 341,550,071,728,321.
        return bases.every(base => {
            let x = modularPower(BigInt(base), d);
            if (x === 1n || x === n - 1n) return true;
            for (let r = 1; r < s; r++) {
                x = x * x % n;
                if (x === n - 1n) return true;
            }
            return false;
        });
    }

    async function getPrimeNeighbors(value, signal) {
        validateValue(value);
        signal?.throwIfAborted();
        async function scan(start, direction) {
            if (start < 2) return null;
            let candidate = start;
            if (candidate > 2 && candidate % 2 === 0) candidate += direction;
            let attempts = 0;
            while (!isPrime(candidate)) {
                candidate += direction * 2;
                if (++attempts % 16 === 0) {
                    await yieldControl();
                    signal?.throwIfAborted();
                }
            }
            signal?.throwIfAborted();
            return candidate;
        }
        const before = await scan(value - 1, -1);
        // Bertrand's postulate keeps the next prime below 2 * value for value > 1.
        const after = await scan(value + 1, 1);
        signal?.throwIfAborted();
        return {
            before,
            after,
            distanceBefore: before === null ? null : value - before,
            distanceAfter: after - value,
            span: before === null ? null : after - before
        };
    }

    function classify(value, divisors) {
        return value === 1 ? 'Unit' : divisors.length === 2 ? 'Prime' : 'Composite';
    }

    return { MAX_INTEGER, parseInteger, sieve, getDivisors, isPrime, getPrimeNeighbors, classify };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PrimeMath;
