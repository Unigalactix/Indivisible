const PrimeLessons = (() => {
    const math = typeof module !== 'undefined' && module.exports ? require('./math.js') : PrimeMath;

    function integer(value, min, max, name = 'Value') {
        if (!Number.isSafeInteger(value) || value < min || value > max) {
            throw new RangeError(`${name} must be a whole number from ${min} through ${max}.`);
        }
        return value;
    }

    function factorTree(value) {
        integer(value, 2, 10000, 'Number');
        function split(n) {
            for (let divisor = 2; divisor * divisor <= n; divisor++) {
                if (n % divisor === 0) return { value: n, children: [split(divisor), split(n / divisor)] };
            }
            return { value: n, children: [] };
        }
        const tree = split(value);
        const factors = [];
        function visit(node) {
            if (!node.children.length) factors.push(node.value);
            node.children.forEach(visit);
        }
        visit(tree);
        const powers = new Map();
        factors.forEach(p => powers.set(p, (powers.get(p) || 0) + 1));
        let divisorCount = 1;
        let totient = value;
        for (const [p, exponent] of powers) {
            divisorCount *= exponent + 1;
            totient = totient / p * (p - 1);
        }
        return { tree, factors, powers: [...powers], divisorCount, totient };
    }

    function euclid(a, b) {
        integer(a, 1, 10000, 'First number');
        integer(b, 1, 10000, 'Second number');
        const originalA = a;
        const originalB = b;
        const steps = [];
        while (b) {
            const quotient = Math.floor(a / b);
            const remainder = a % b;
            steps.push({ a, b, quotient, remainder });
            [a, b] = [b, remainder];
        }
        return { gcd: a, lcm: originalA / a * originalB, steps };
    }

    function distribution(limit) {
        integer(limit, 100, 100000, 'Limit');
        const primes = math.sieve(limit);
        const points = [];
        let count = 0;
        const stride = Math.max(1, Math.floor(limit / 200));
        for (let x = 2; x <= limit; x++) {
            if (primes[count] === x) count++;
            if (x % stride === 0 || x === limit) points.push({ x, actual: count, estimate: x / Math.log(x) });
        }
        const estimate = limit / Math.log(limit);
        return { primes, points, count, estimate, relativeError: (estimate - count) / count * 100 };
    }

    function primeWindow(start) {
        integer(start, 1, 99901, 'Window start');
        const end = start + 99;
        const primes = math.sieve(end).filter(p => p >= start);
        const gaps = primes.slice(1).map((p, i) => ({ from: primes[i], to: p, gap: p - primes[i] }));
        return { start, end, primes, gaps, maxGap: gaps.length ? Math.max(...gaps.map(g => g.gap)) : null };
    }

    function spiral(side) {
        integer(side, 3, 61, 'Grid side');
        if (side % 2 === 0) throw new RangeError('The spiral needs an odd side length.');
        const primes = new Set(math.sieve(side * side));
        const center = Math.floor(side / 2);
        const points = [{ value: 1, x: center, y: center, prime: false }];
        const directions = [[1, 0], [0, -1], [-1, 0], [0, 1]];
        let x = center;
        let y = center;
        let value = 1;
        let length = 1;
        let direction = 0;
        while (value < side * side) {
            for (let twice = 0; twice < 2; twice++) {
                const [dx, dy] = directions[direction++ % 4];
                for (let step = 0; step < length && value < side * side; step++) {
                    x += dx;
                    y += dy;
                    value++;
                    points.push({ value, x, y, prime: primes.has(value) });
                }
            }
            length++;
        }
        return points;
    }

    function modular(modulus, multiplier) {
        integer(modulus, 2, 12, 'Clock size');
        integer(multiplier, 1, 20, 'Step size');
        const residues = Array.from({ length: modulus }, (_, k) => multiplier * k % modulus);
        const gcd = euclid(modulus, multiplier).gcd;
        const inverse = Array.from({ length: modulus }, (_, k) => k).find(k => multiplier * k % modulus === 1) ?? null;
        const table = Array.from({ length: modulus - 1 }, (_, row) =>
            Array.from({ length: modulus - 1 }, (_, col) => (row + 1) * (col + 1) % modulus));
        return { residues, gcd, inverse, table, field: math.isPrime(modulus) };
    }

    function rsa(p, q, message) {
        integer(p, 3, 97, 'First prime');
        integer(q, 3, 97, 'Second prime');
        if (!math.isPrime(p) || !math.isPrime(q) || p === q) {
            throw new RangeError('Choose two different primes.');
        }
        const n = p * q;
        integer(message, 0, n - 1, 'Message');
        const phi = (p - 1) * (q - 1);
        let e = 17;
        if (e >= phi || euclid(e, phi).gcd !== 1) {
            e = 3;
            while (euclid(e, phi).gcd !== 1) e += 2;
        }
        let d = 1;
        while (e * d % phi !== 1) d++;
        const encrypted = Number(math.modularPower(BigInt(message), BigInt(e), BigInt(n)));
        const decrypted = Number(math.modularPower(BigInt(encrypted), BigInt(d), BigInt(n)));
        return { n, phi, e, d, message, encrypted, decrypted };
    }

    function goldbach(value) {
        integer(value, 4, 2000, 'Even number');
        if (value % 2) throw new RangeError('Choose an even number.');
        const primes = math.sieve(value);
        const lookup = new Set(primes);
        return primes.filter(p => p <= value / 2 && lookup.has(value - p)).map(p => [p, value - p]);
    }

    function progressions(modulus, residue) {
        integer(modulus, 2, 20, 'Modulus');
        integer(residue, 0, modulus - 1, 'Residue');
        const primes = math.sieve(1000);
        const counts = Array(modulus).fill(0);
        primes.forEach(p => counts[p % modulus]++);
        // gcd(0, q) = q; the public Euclidean demo takes positive integers.
        const gcd = residue === 0 ? modulus : euclid(residue, modulus).gcd;
        return { primes: primes.filter(p => p % modulus === residue), counts, coprime: gcd === 1, gcd };
    }

    function zeta(s, terms) {
        if (!Number.isFinite(s) || s < 1.2 || s > 4) throw new RangeError('Choose s between 1.2 and 4.');
        integer(terms, 10, 1000, 'Term count');
        let sum = 0;
        for (let n = 1; n <= terms; n++) sum += n ** -s;
        const logProduct = math.sieve(terms).reduce((total, p) => total - Math.log1p(-(p ** -s)), 0);
        return { sum, product: Math.exp(logProduct), tailBound: terms ** (1 - s) / (s - 1), exact: s === 2 ? Math.PI ** 2 / 6 : null };
    }

    function intervalScale(power) {
        integer(power, 6, 18, 'Power of ten');
        return { x: 10 ** power, oldLength: 10 ** (power * 7 / 12), newLength: 10 ** (power * 17 / 30) };
    }

    return { integer, factorTree, euclid, distribution, primeWindow, spiral, modular, rsa, goldbach, progressions, zeta, intervalScale };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PrimeLessons;
