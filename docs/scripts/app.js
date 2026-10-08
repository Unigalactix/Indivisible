(() => {
    'use strict';

    const format = number => number.toLocaleString('en-US');
    const nextTurn = () => new Promise(resolve => setTimeout(resolve, 0));

    // Preserve bookmarks into the former single-page site.
    const legacySections = {
        '#history': 'foundations.html#history',
        '#records': 'explore.html#largest',
        '#largest': 'explore.html#largest',
        '#algorithms': 'explore.html#algorithms',
        '#gaps': 'explore.html#gaps',
        '#deep-math': 'advanced.html#deep-math',
        '#mysteries': 'advanced.html#mysteries',
        '#interactive': 'playground.html#interactive',
        '#analyzer': 'playground.html#analyzer',
        '#glossary': 'resources.html#glossary'
    };
    function followLegacyBookmark() {
        const home = location.pathname.endsWith('/') || location.pathname.endsWith('/index.html');
        if (home && legacySections[location.hash]) location.replace(legacySections[location.hash]);
    }
    followLegacyBookmark();
    window.addEventListener('hashchange', followLegacyBookmark);

    const tabs = [...document.querySelectorAll('[role="tab"]')];
    function activateTab(selected, moveFocus = false) {
        for (const tab of tabs) {
            const active = tab === selected;
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
        }
        if (moveFocus) selected.focus();
    }
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateTab(tab));
        tab.addEventListener('keydown', event => {
            let target;
            if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
            if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
            if (event.key === 'Home') target = 0;
            if (event.key === 'End') target = tabs.length - 1;
            if (target !== undefined) {
                event.preventDefault();
                activateTab(tabs[target], true);
            }
        });
    });

    const directory = document.getElementById('primeDirectory');
    if (directory) {
        const primes = PrimeMath.sieve(1000);
        for (let start = 1; start <= 1000; start += 100) {
            const end = start + 99;
            const group = primes.filter(prime => prime >= start && prime <= end);
            const details = document.createElement('details');
            details.open = start === 1;
            const summary = document.createElement('summary');
            summary.textContent = `${format(start)}–${format(end)} · ${group.length} primes`;
            const numbers = document.createElement('p');
            numbers.className = 'prime-range';
            numbers.textContent = group.join(', ');
            details.append(summary, numbers);
            directory.append(details);
        }
    }

    const grid = document.getElementById('gridContainer');
    if (grid) {
        const startButton = document.getElementById('startBtn');
        const resetButton = document.getElementById('resetBtn');
        const speed = document.getElementById('sieveSpeed');
        const status = document.getElementById('statusText');
        const primeList = document.getElementById('primeList');
        const primeCount = document.getElementById('primeCount');
        let sieveController;
        const cells = [];
        const found = new Set();
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) speed.value = '0';

        function initialize() {
            grid.replaceChildren();
            primeList.replaceChildren();
            cells.length = 0;
            found.clear();
            primeCount.textContent = '0';
            status.textContent = 'Start the sieve to find every prime up to 100. The number 1 is a unit, not a composite.';
            for (let value = 1; value <= 100; value++) {
                const cell = document.createElement('div');
                cell.className = value === 1 ? 'number-cell unit' : 'number-cell';
                cell.id = `num-${value}`;
                cell.textContent = String(value);
                cell.setAttribute('role', 'listitem');
                cell.setAttribute('aria-label', value === 1 ? '1: unit, neither prime nor composite' : `${value}: not yet classified`);
                cells[value] = cell;
                grid.append(cell);
            }
        }

        function markPrime(value) {
            if (found.has(value)) return;
            found.add(value);
            cells[value].className = 'number-cell prime';
            cells[value].setAttribute('aria-label', `${value}: prime`);
            const badge = document.createElement('span');
            badge.textContent = String(value);
            primeList.append(badge);
            primeCount.textContent = String(found.size);
        }

        async function wait(signal, multiplier = 1) {
            await new Promise(resolve => setTimeout(resolve, Number(speed.value) * multiplier));
            signal.throwIfAborted();
        }

        startButton.addEventListener('click', async () => {
            if (sieveController) return;
            const controller = new AbortController();
            sieveController = controller;
            const { signal } = controller;
            initialize();
            startButton.disabled = true;
            const composite = Array(101).fill(false);
            try {
                for (let prime = 2; prime * prime <= 100; prime++) {
                    if (composite[prime]) continue;
                    markPrime(prime);
                    cells[prime].classList.add('current');
                    status.textContent = `${prime} is uncrossed, so it is prime. Cross out multiples starting at ${prime}² = ${prime * prime}.`;
                    await wait(signal, 5);
                    cells[prime].classList.remove('current');
                    for (let multiple = prime * prime; multiple <= 100; multiple += prime) {
                        if (composite[multiple]) continue;
                        composite[multiple] = true;
                        cells[multiple].classList.add('current');
                        await wait(signal);
                        cells[multiple].className = 'number-cell composite';
                        cells[multiple].setAttribute('aria-label', `${multiple}: composite, divisible by ${prime}`);
                    }
                }
                signal.throwIfAborted();
                for (let value = 2; value <= 100; value++) {
                    if (!composite[value]) markPrime(value);
                }
                status.textContent = 'Complete! All multiples of primes up to √100 = 10 are crossed out. The 25 uncrossed numbers are prime.';
            } catch (error) {
                if (!signal.aborted) {
                    console.error('Sieve failed:', error);
                    status.textContent = 'The sieve could not finish. Reset it and try again.';
                }
            } finally {
                if (sieveController === controller) {
                    sieveController = undefined;
                    startButton.disabled = false;
                }
            }
        });
        resetButton.addEventListener('click', () => {
            sieveController?.abort();
            sieveController = undefined;
            startButton.disabled = false;
            initialize();
        });
        initialize();
    }

    const analyzerForm = document.getElementById('analyzerForm');
    if (analyzerForm) {
        const input = document.getElementById('primeInput');
        const errorMessage = document.getElementById('inputError');
        const feedback = document.getElementById('analysisFeedback');
        const result = document.getElementById('analyzerResult');
        const divisorList = document.getElementById('divisorList');
        const factorPair = document.getElementById('factorPair');
        let analysisController;
        let analyzedValue;

        function clearAnalysis() {
            analysisController?.abort();
            analysisController = undefined;
            analyzedValue = undefined;
            result.hidden = true;
            result.setAttribute('aria-busy', 'false');
            divisorList.replaceChildren();
            errorMessage.textContent = '';
            feedback.textContent = '';
            input.setAttribute('aria-invalid', 'false');
        }
        input.addEventListener('input', clearAnalysis);

        analyzerForm.addEventListener('submit', async event => {
            event.preventDefault();
            clearAnalysis();
            let value;
            try {
                value = PrimeMath.parseInteger(input.value);
            } catch (error) {
                console.error('Prime analyzer input validation:', error.message);
                input.setAttribute('aria-invalid', 'true');
                errorMessage.textContent = error.message;
                input.focus();
                return;
            }
            const controller = new AbortController();
            analysisController = controller;
            const { signal } = controller;
            feedback.textContent = `Analyzing ${format(value)}… You can change the input at any time.`;
            result.setAttribute('aria-busy', 'true');
            try {
                await nextTurn();
                signal.throwIfAborted();
                const divisors = await PrimeMath.getDivisors(value, signal);
                const neighbors = await PrimeMath.getPrimeNeighbors(value, signal);
                signal.throwIfAborted();
                const classification = PrimeMath.classify(value, divisors);
                document.getElementById('classification').textContent = `${format(value)} is ${classification === 'Unit' ? 'a Unit' : classification}.`;
                document.getElementById('classificationDetail').textContent = classification === 'Unit'
                    ? '1 is neither prime nor composite. Its only positive divisor is 1.'
                    : classification === 'Prime'
                        ? 'Exactly two positive divisors: 1 and itself.'
                        : `${format(divisors.length)} positive divisors. More than two means composite.`;
                document.getElementById('previousPrime').textContent = neighbors.before === null ? 'None' : format(neighbors.before);
                document.getElementById('previousDistance').textContent = neighbors.before === null
                    ? `No prime exists below ${format(value)}.`
                    : `${format(value)} − ${format(neighbors.before)} = ${format(neighbors.distanceBefore)} away`;
                document.getElementById('neighborInput').textContent = format(value);
                document.getElementById('nextPrime').textContent = format(neighbors.after);
                document.getElementById('nextDistance').textContent = `${format(neighbors.after)} − ${format(value)} = ${format(neighbors.distanceAfter)} away`;
                document.getElementById('neighborSpan').textContent = neighbors.span === null
                    ? 'Not applicable'
                    : `${format(neighbors.after)} − ${format(neighbors.before)} = ${format(neighbors.span)}`;
                document.getElementById('neighborExplanation').textContent = neighbors.before === null
                    ? 'A two-sided gap needs a prime on each side; there is no preceding prime here.'
                    : classification === 'Prime'
                        ? 'Your number is prime, so this span combines two consecutive prime gaps.'
                        : 'These are consecutive primes. Their difference is the prime gap containing your number.';
                document.getElementById('neighborLimitNote').hidden = neighbors.after <= PrimeMath.MAX_INTEGER;
                document.getElementById('divisorCount').textContent = format(divisors.length);
                factorPair.textContent = 'Choose a divisor above to see its factor pair.';
                result.hidden = false;
                analyzedValue = value;
                for (let start = 0; start < divisors.length; start += 250) {
                    signal.throwIfAborted();
                    const fragment = document.createDocumentFragment();
                    for (const divisor of divisors.slice(start, start + 250)) {
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.dataset.divisor = String(divisor);
                        button.textContent = format(divisor);
                        button.setAttribute('aria-pressed', 'false');
                        button.setAttribute('aria-label', `${format(divisor)}: show factor pair`);
                        fragment.append(button);
                    }
                    divisorList.append(fragment);
                    if (start + 250 < divisors.length) await nextTurn();
                }
                signal.throwIfAborted();
                feedback.textContent = `Complete. ${classification}. Nearest primes and all ${format(divisors.length)} positive divisors are shown.`;
            } catch (error) {
                if (!signal.aborted) {
                    console.error('Prime analysis failed:', error);
                    result.hidden = true;
                    feedback.textContent = '';
                    errorMessage.textContent = 'The analysis could not finish. Please try again with a smaller number.';
                }
            } finally {
                if (analysisController === controller) {
                    analysisController = undefined;
                    result.setAttribute('aria-busy', 'false');
                }
            }
        });

        document.querySelectorAll('[data-example]').forEach(button => {
            button.addEventListener('click', () => {
                input.value = button.dataset.example;
                analyzerForm.requestSubmit();
            });
        });
        divisorList.addEventListener('click', event => {
            const button = event.target.closest('button[data-divisor]');
            if (!button || analyzedValue === undefined) return;
            divisorList.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
            button.setAttribute('aria-pressed', 'true');
            const divisor = Number(button.dataset.divisor);
            factorPair.textContent = `${format(divisor)} × ${format(analyzedValue / divisor)} = ${format(analyzedValue)}`;
        });
    }
})();
