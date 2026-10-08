const PrimeGraph = (() => {
    const math = typeof module !== 'undefined' && module.exports ? require('./math.js') : PrimeMath;
    const relations = ['factor', 'shared', 'gap'];
    const modes = ['sweep', 'forge', 'path'];

    function integer(value, min, max, label) {
        if (!Number.isInteger(value) || value < min || value > max) {
            throw new RangeError(`${label} must be an integer from ${min} to ${max}.`);
        }
    }

    function factors(value) {
        integer(value, 1, 48, 'Node');
        const result = [];
        for (let p = 2; p * p <= value; p++) {
            while (value % p === 0) {
                result.push(p);
                value /= p;
            }
        }
        if (value > 1) result.push(value);
        return result;
    }

    function gcd(a, b) {
        while (b) [a, b] = [b, a % b];
        return a;
    }

    function graph(limit, relation = 'factor') {
        integer(limit, 12, 48, 'Graph limit');
        if (!relations.includes(relation)) throw new RangeError('Choose a supported relationship.');
        const primes = new Set(math.sieve(limit));
        const nodes = Array.from({ length: limit }, (_, i) => ({
            value: i + 1,
            kind: i === 0 ? 'unit' : primes.has(i + 1) ? 'prime' : 'composite',
            factors: factors(i + 1)
        }));
        const edges = [];
        for (let a = 1; a <= limit; a++) {
            for (let b = a + 1; b <= limit; b++) {
                if (relation === 'factor' && b % a === 0 && primes.has(b / a)) {
                    edges.push({ from: a, to: b, weight: b / a, label: `${a} × ${b / a} = ${b}` });
                } else if (relation === 'shared' && gcd(a, b) > 1) {
                    edges.push({ from: a, to: b, weight: gcd(a, b), label: `gcd(${a}, ${b}) = ${gcd(a, b)}` });
                }
            }
        }
        if (relation === 'gap') {
            const list = [...primes];
            list.slice(1).forEach((p, i) => edges.push({
                from: list[i], to: p, weight: p - list[i], label: `${p} − ${list[i]} = ${p - list[i]}`
            }));
        }
        return { limit, relation, nodes, edges };
    }

    function shortestPath(data, start, target, excludeUnit = false) {
        integer(start, 1, data.limit, 'Start');
        integer(target, 1, data.limit, 'Target');
        if (excludeUnit && (start === 1 || target === 1)) return null;
        const queue = [[start]];
        const seen = new Set([start]);
        for (let index = 0; index < queue.length; index++) {
            const path = queue[index];
            const current = path.at(-1);
            if (current === target) return path;
            for (const edge of data.edges) {
                const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
                if (next === null || seen.has(next) || (excludeUnit && next === 1)) continue;
                seen.add(next);
                queue.push([...path, next]);
            }
        }
        return null;
    }

    function challenge(mode, limit, variant = 0) {
        if (!modes.includes(mode)) throw new RangeError('Choose a supported challenge.');
        integer(variant, 0, 1000000, 'Round');
        const data = graph(limit);
        const base = { mode, limit, status: 'playing', mistakes: 0, moves: [], found: [], product: 1 };
        if (mode === 'sweep') return { ...base, required: data.nodes.filter(n => n.kind === 'prime').map(n => n.value) };
        if (mode === 'forge') {
            const targets = data.nodes.filter(n => n.factors.length >= 3).map(n => n.value);
            return { ...base, target: targets[variant % targets.length] };
        }
        const pairs = [[2, 9], [4, 27], [8, 25], [9, 16], [4, 9]];
        const candidates = pairs.filter(([a, b]) => a <= limit && b <= limit && shortestPath(data, a, b, true));
        const [start, target] = candidates[variant % candidates.length];
        return { ...base, start, target, moves: [start], best: shortestPath(data, start, target, true).length - 1 };
    }

    function move(state, value) {
        integer(value, 1, state.limit, 'Node');
        if (state.status !== 'playing') return { state, message: 'This round has ended. Start another to play again.', accepted: false };
        const next = { ...state, moves: [...state.moves], found: [...state.found] };
        function reject(message, penalize = true) {
            if (penalize) next.mistakes++;
            return { state: next, message, accepted: false };
        }
        if (state.mode === 'sweep') {
            if (state.found.includes(value)) return reject(`${value} is already collected. No extra point or penalty.`, false);
            if (!state.required.includes(value)) {
                return reject(value === 1 ? '1 is a unit, not a prime. It has only one positive divisor.' : `${value} is composite: ${factors(value).join(' × ')}.`);
            }
            next.found.push(value);
            next.moves.push(value);
            if (next.found.length === state.required.length) next.status = 'won';
            return { state: next, message: `${value} is prime. ${next.found.length} of ${state.required.length} collected.`, accepted: true };
        }
        if (state.mode === 'forge') {
            if (!math.isPrime(value)) return reject(value === 1
                ? '1 changes nothing when you multiply by it. It is a unit, not a prime building block.'
                : `${value} is composite: ${factors(value).join(' × ')}. Choose one prime building block at a time.`);
            const product = state.product * value;
            if (product > state.target || state.target % product !== 0) {
                return reject(`${state.product} × ${value} = ${product} cannot lead to ${state.target} using whole-number factors. Try another prime.`);
            }
            next.product = product;
            next.moves.push(value);
            if (product === state.target) next.status = 'won';
            return { state: next, message: `${state.product} × ${value} = ${product}. ${product === state.target ? 'Target assembled!' : `Still need a factor of ${state.target / product}.`}`, accepted: true };
        }
        if (state.mode === 'path') {
            if (value === 1) return reject('The unit node is closed for this challenge. Navigate through numbers greater than 1.');
            const current = state.moves.at(-1);
            if (current === value) return reject('You are already here. Choose a connected node.', false);
            const ratio = Math.max(current, value) / Math.min(current, value);
            if (!Number.isInteger(ratio) || !math.isPrime(ratio)) {
                return reject(`${current} and ${value} are not one prime-multiplication step apart.`);
            }
            next.moves.push(value);
            if (value === state.target) next.status = 'won';
            return { state: next, message: `${current} → ${value}: ${current < value ? 'multiply' : 'divide'} by prime ${ratio}.`, accepted: true };
        }
        throw new RangeError('Unsupported challenge state.');
    }

    function score(state) {
        const progress = state.mode === 'sweep' ? state.found.length : state.mode === 'forge' ? state.moves.length : Math.max(0, state.moves.length - 1);
        // Traversal loops never earn points; only completing the route does.
        const earned = state.mode === 'path' ? 0 : progress * 10;
        const bonus = state.status === 'won' ? 100 : 0;
        const extraSteps = state.mode === 'path' && state.status === 'won' ? Math.max(0, progress - state.best) * 5 : 0;
        return Math.max(0, earned + bonus - state.mistakes * 5 - extraSteps);
    }

    return { graph, factors, shortestPath, challenge, move, score };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PrimeGraph;
