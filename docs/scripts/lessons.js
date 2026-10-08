(() => {
    'use strict';
    const svgNS = 'http://www.w3.org/2000/svg';
    const format = value => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    function node(tag, attributes = {}, text) {
        const element = document.createElementNS(svgNS, tag);
        for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
        if (text !== undefined) element.textContent = String(text);
        return element;
    }
    function canvas(id, description, width = 640, height = 280) {
        const svg = document.getElementById(id);
        svg.replaceChildren(node('title', {}, description));
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        return svg;
    }
    function text(svg, x, y, value, attributes = {}) {
        svg.append(node('text', { x, y, fill: '#a0a69e', 'font-size': 12, ...attributes }, value));
    }
    function line(svg, x1, y1, x2, y2, color = '#424c3b') {
        svg.append(node('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': 2 }));
    }
    function setup(id, render) {
        const form = document.getElementById(id);
        if (!form) return;
        const error = document.getElementById(`${id}Error`);
        const output = document.getElementById(`${id}Output`);
        const read = name => {
            const field = form.elements.namedItem(name);
            if (!field || field.value.trim() === '') throw new RangeError('Fill in every control before continuing.');
            const value = Number(field.value);
            if (!Number.isFinite(value)) throw new RangeError('Enter a valid number.');
            return value;
        };
        function update(event) {
            if (event?.type === 'submit') event.preventDefault();
            try {
                render(read, output, form);
                error.textContent = '';
                output.hidden = false;
            } catch (failure) {
                console.error(`Interactive lesson ${id}:`, failure);
                error.textContent = failure instanceof RangeError ? failure.message : 'This visualization could not update. Please reload and try again.';
                output.hidden = true;
            }
        }
        form.addEventListener('submit', update);
        form.addEventListener('input', update);
        update();
    }

    setup('factorForm', (read, output) => {
        const value = read('number');
        const result = PrimeLessons.factorTree(value);
        const positions = [];
        const edges = [];
        let leaf = 0;
        let maxDepth = 0;
        function place(tree, depth) {
            maxDepth = Math.max(depth, maxDepth);
            const children = tree.children.map(child => place(child, depth + 1));
            const x = children.length ? children.reduce((sum, child) => sum + child.x, 0) / children.length : 42 + leaf++ * 72;
            const position = { x, y: 35 + depth * 70, value: tree.value, prime: !children.length };
            positions.push(position);
            children.forEach(child => edges.push([position, child]));
            return position;
        }
        place(result.tree, 0);
        const svg = canvas('factorSvg', `Factor tree of ${value}: ${result.factors.join(' times ')}`, Math.max(220, leaf * 72 + 12), maxDepth * 70 + 75);
        edges.forEach(([a, b]) => line(svg, a.x, a.y + 17, b.x, b.y - 17));
        positions.forEach(p => {
            svg.append(node('rect', { x: p.x - 30, y: p.y - 18, width: 60, height: 36, rx: 11, fill: p.prime ? '#c1ff72' : '#20271c', stroke: '#4a573e' }));
            text(svg, p.x, p.y + 5, p.value, { 'text-anchor': 'middle', fill: p.prime ? '#17210e' : '#f0f1ed', 'font-size': 14 });
        });
        document.getElementById('factorSummary').textContent = `${format(value)} = ${result.factors.join(' × ')}. ${result.divisorCount} positive divisors; φ(${value}) = ${result.totient}.`;
        document.getElementById('factorCountRule').textContent = `Divisor-count rule: ${result.powers.map(([, e]) => `(${e} + 1)`).join(' × ')} = ${result.divisorCount}. Choose an exponent from 0 to its maximum for each distinct prime.`;
    });

    setup('euclidForm', (read, output) => {
        const a = read('first');
        const b = read('second');
        const result = PrimeLessons.euclid(a, b);
        const steps = document.getElementById('euclidSteps');
        steps.replaceChildren();
        result.steps.forEach(step => {
            const row = document.createElement('li');
            row.className = 'euclid-step';
            row.textContent = `${step.a} = ${step.quotient} × ${step.b} + ${step.remainder}`;
            const bar = document.createElement('span');
            bar.className = 'remainder-bar';
            bar.style.width = `${Math.max(1, step.remainder / step.b * 100)}%`;
            bar.setAttribute('aria-hidden', 'true');
            row.append(bar);
            steps.append(row);
        });
        document.getElementById('euclidSummary').textContent = `gcd(${a}, ${b}) = ${result.gcd}. lcm(${a}, ${b}) = ${format(result.lcm)}. ${result.gcd === 1 ? 'These numbers are coprime.' : 'The last nonzero remainder is their greatest common divisor.'}`;
    });

    setup('distributionForm', read => {
        const limit = read('limit');
        const result = PrimeLessons.distribution(limit);
        const svg = canvas('distributionSvg', `Sampled prime count and x / ln(x), from 2 through ${limit}`);
        const scale = Math.max(result.count, result.estimate) * 1.12;
        const x = value => 55 + value / limit * 550;
        const y = value => 235 - value / scale * 210;
        line(svg, 55, 25, 55, 235);
        line(svg, 55, 235, 610, 235);
        for (let i = 0; i <= 4; i++) {
            const value = Math.round(limit * i / 4);
            text(svg, x(value), 258, format(value), { 'text-anchor': 'middle' });
            text(svg, 47, y(result.count * i / 4) + 4, format(Math.round(result.count * i / 4)), { 'text-anchor': 'end', 'font-size': 10 });
        }
        for (const [key, color] of [['actual', '#c1ff72'], ['estimate', '#c8a0fa']]) {
            svg.append(node('polyline', { points: result.points.map(p => `${x(p.x)},${y(p[key])}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2.5 }));
        }
        document.getElementById('distributionSummary').textContent = `π(${format(limit)}) = ${format(result.count)}. x / ln(x) = ${format(result.estimate)}. Relative error: ${result.relativeError.toFixed(2)}%.`;
        document.getElementById('distributionActual').textContent = format(result.count);
        document.getElementById('distributionEstimate').textContent = format(result.estimate);
    });

    setup('windowForm', read => {
        const result = PrimeLessons.primeWindow(read('start'));
        const svg = canvas('windowSvg', `Primes in the inclusive interval ${result.start} to ${result.end}`, 640, 150);
        const x = value => 25 + (value - result.start) / 99 * 590;
        line(svg, 25, 75, 615, 75);
        result.primes.forEach(p => {
            const circle = node('circle', { cx: x(p), cy: 75, r: 4, fill: '#c1ff72' });
            circle.append(node('title', {}, `Prime ${p}`));
            svg.append(circle);
        });
        [result.start, result.start + 49, result.end].forEach(value => text(svg, x(value), 110, format(value), { 'text-anchor': 'middle' }));
        document.getElementById('windowSummary').textContent = `${result.primes.length} primes in ${format(result.start)}–${format(result.end)}. ${result.maxGap === null ? 'Not enough primes inside this window to measure an internal gap.' : `Largest gap between primes inside this window: ${result.maxGap}.`}`;
        document.getElementById('windowPrimes').textContent = result.primes.length ? result.primes.join(', ') : 'No primes in this window.';
    });

    setup('spiralForm', (read, output, form) => {
        const side = read('side');
        const points = PrimeLessons.spiral(side);
        const selected = read('selected');
        form.elements.namedItem('selected').max = String(side * side);
        PrimeLessons.integer(selected, 1, side * side, 'Selected number');
        const svg = canvas('spiralSvg', `${side} by ${side} Ulam spiral. Prime numbers are green; selected number ${selected}.`, side * 12, side * 12);
        points.forEach(p => {
            const rect = node('rect', { x: p.x * 12 + 1, y: p.y * 12 + 1, width: 10, height: 10, rx: 1, fill: p.prime ? '#c1ff72' : '#252d22', 'data-number': p.value, stroke: p.value === selected ? '#fff' : 'none', 'stroke-width': 2 });
            rect.append(node('title', {}, `${p.value}: ${p.prime ? 'prime' : p.value === 1 ? 'unit' : 'composite'}`));
            svg.append(rect);
            if (side <= 11) text(svg, p.x * 12 + 6, p.y * 12 + 8, p.value, { 'text-anchor': 'middle', 'font-size': 4, fill: p.prime ? '#152008' : '#cbd2c6', 'pointer-events': 'none' });
        });
        const point = points[selected - 1];
        document.getElementById('spiralSummary').textContent = `${points.filter(p => p.prime).length} primes among ${points.length} integers. Selected ${selected}: ${point.prime ? 'prime' : selected === 1 ? 'unit' : 'composite'}.`;
    });
    document.getElementById('spiralSvg')?.addEventListener('click', event => {
        const rect = event.target.closest('[data-number]');
        if (!rect) return;
        const form = document.getElementById('spiralForm');
        form.elements.namedItem('selected').value = rect.dataset.number;
        form.requestSubmit();
    });

    setup('modularForm', read => {
        const modulus = read('modulus');
        const multiplier = read('multiplier');
        const result = PrimeLessons.modular(modulus, multiplier);
        const svg = canvas('modularSvg', `Steps of ${multiplier} on a clock with ${modulus} positions`, 300, 270);
        const position = k => ({ x: 150 + Math.sin(k / modulus * 2 * Math.PI) * 96, y: 135 - Math.cos(k / modulus * 2 * Math.PI) * 96 });
        result.residues.forEach((r, i) => {
            const a = position(r);
            const b = position(result.residues[(i + 1) % modulus]);
            line(svg, a.x, a.y, b.x, b.y, '#658843');
        });
        for (let k = 0; k < modulus; k++) {
            const p = position(k);
            svg.append(node('circle', { cx: p.x, cy: p.y, r: 15, fill: result.residues.includes(k) ? '#c1ff72' : '#252d22' }));
            text(svg, p.x, p.y + 4, k, { 'text-anchor': 'middle', fill: result.residues.includes(k) ? '#152008' : '#cbd2c6' });
        }
        const table = document.getElementById('modularTable');
        table.replaceChildren();
        const caption = table.createCaption();
        caption.textContent = `Multiplication modulo ${modulus}. Cells with result 1 show inverse pairs.`;
        const head = table.createTHead().insertRow();
        for (let k = 0; k < modulus; k++) {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = k === 0 ? '×' : k;
            head.append(th);
        }
        const body = table.createTBody();
        result.table.forEach((values, row) => {
            const tr = body.insertRow();
            const th = document.createElement('th');
            th.scope = 'row';
            th.textContent = String(row + 1);
            tr.append(th);
            values.forEach(value => {
                const td = tr.insertCell();
                td.textContent = String(value);
                if (value === 1) td.className = 'inverse-cell';
            });
        });
        document.getElementById('modularSummary').textContent = `Remainders: ${result.residues.join(' → ')} → 0. gcd(${multiplier}, ${modulus}) = ${result.gcd}. ${result.inverse === null ? 'This step has no multiplicative inverse.' : `${multiplier} × ${result.inverse} ≡ 1 (mod ${modulus}).`} ${result.field ? 'Prime modulus: every nonzero class is invertible.' : 'Composite modulus: some nonzero classes have no inverse.'}`;
    });

    setup('rsaForm', read => {
        const p = read('p');
        const q = read('q');
        const result = PrimeLessons.rsa(p, q, read('message'));
        document.getElementById('rsaN').textContent = `${p} × ${q} = ${result.n}`;
        document.getElementById('rsaKeys').textContent = `φ(n) = ${result.phi}; public exponent e = ${result.e}; private exponent d = ${result.d}. ${result.e} × ${result.d} ≡ 1 (mod ${result.phi}).`;
        document.getElementById('rsaPlain').textContent = result.message;
        document.getElementById('rsaCipher').textContent = result.encrypted;
        document.getElementById('rsaRecovered').textContent = result.decrypted;
        document.getElementById('rsaSummary').textContent = `Encrypt: ${result.message}^${result.e} mod ${result.n} = ${result.encrypted}. Decrypt: ${result.encrypted}^${result.d} mod ${result.n} = ${result.decrypted}. Exact round trip, even when the message shares a factor with n.`;
    });

    setup('goldbachForm', read => {
        const value = read('even');
        const pairs = PrimeLessons.goldbach(value);
        const list = document.getElementById('goldbachPairs');
        list.replaceChildren();
        pairs.forEach(([p, q]) => {
            const row = document.createElement('div');
            row.className = 'goldbach-pair';
            const label = document.createElement('span');
            label.textContent = `${p} + ${q}`;
            const bar = document.createElement('span');
            bar.className = 'pair-bar';
            bar.setAttribute('aria-hidden', 'true');
            const first = document.createElement('i');
            first.style.width = `${p / value * 100}%`;
            bar.append(first);
            row.append(label, bar);
            list.append(row);
        });
        document.getElementById('goldbachSummary').textContent = `${value} has ${pairs.length} unordered prime-pair representations. These examples are evidence, not a proof for all even integers.`;
    });

    setup('progressionForm', read => {
        const modulus = read('modulus');
        const residue = read('residue');
        const result = PrimeLessons.progressions(modulus, residue);
        const svg = canvas('progressionSvg', `Prime counts up to 1000 by remainder modulo ${modulus}`, 640, 230);
        const max = Math.max(...result.counts);
        const width = 580 / modulus;
        result.counts.forEach((count, r) => {
            const height = count / max * 150;
            svg.append(node('rect', { x: 30 + r * width, y: 175 - height, width: width - 4, height, rx: 3, fill: r === residue ? '#c1ff72' : '#7d659a' }));
            text(svg, 30 + r * width + (width - 4) / 2, 196, r, { 'text-anchor': 'middle' });
            text(svg, 30 + r * width + (width - 4) / 2, 166 - height, count, { 'text-anchor': 'middle', 'font-size': 10 });
        });
        document.getElementById('progressionSummary').textContent = `${result.primes.length} primes ≤ 1,000 satisfy p ≡ ${residue} (mod ${modulus}). ${result.coprime ? 'The residue and modulus are coprime, so Dirichlet’s theorem guarantees infinitely many in this class (not equal counts in each small sample).' : `They share factor ${result.gcd}; only prime divisors of the modulus can appear in this class.`}`;
        document.getElementById('progressionPrimes').textContent = result.primes.join(', ') || 'No primes in this residue class up to 1,000.';
    });

    setup('zetaForm', read => {
        const s = read('s');
        const terms = read('terms');
        const result = PrimeLessons.zeta(s, terms);
        const upper = result.sum + result.tailBound;
        document.getElementById('zetaSum').textContent = result.sum.toFixed(8);
        document.getElementById('zetaProduct').textContent = result.product.toFixed(8);
        document.getElementById('zetaSumBar').style.width = `${result.sum / upper * 100}%`;
        document.getElementById('zetaProductBar').style.width = `${result.product / upper * 100}%`;
        document.getElementById('zetaSummary').textContent = `s = ${s}; cutoff N = ${terms}. The series' omitted tail is positive and at most ${result.tailBound.toFixed(6)}. Both truncations are below ζ(s). ${result.exact === null ? 'Increasing N improves these approximations; this experiment uses real s > 1, not complex zeros.' : `At s = 2, ζ(2) = π²/6 ≈ ${result.exact.toFixed(8)}.`}`;
    });

    setup('intervalForm', read => {
        const power = read('power');
        const result = PrimeLessons.intervalScale(power);
        document.getElementById('intervalOld').textContent = format(result.oldLength);
        document.getElementById('intervalNew').textContent = format(result.newLength);
        document.getElementById('intervalNewBar').style.width = `${result.newLength / result.oldLength * 100}%`;
        document.getElementById('intervalSummary').textContent = `At the illustrative scale x = 10^${power}, x^(17/30) is ${(result.newLength / result.oldLength * 100).toFixed(1)}% of x^(7/12). These are real-valued scale comparisons, not certified prime-containing windows at this x; the theorem is asymptotic and requires an exponent strictly above 17/30.`;
    });

    for (const input of document.querySelectorAll('[data-filter-target]')) {
        const container = document.getElementById(input.dataset.filterTarget);
        const count = document.getElementById(input.dataset.filterCount);
        input.addEventListener('input', () => {
            const query = input.value.trim().toLocaleLowerCase();
            let matches = 0;
            for (const item of container.children) {
                const visible = item.textContent.toLocaleLowerCase().includes(query);
                item.hidden = !visible;
                if (visible) matches++;
            }
            count.textContent = `${matches} matching entries${matches === 0 ? '. Try a broader search.' : '.'}`;
        });
    }
})();
