(() => {
    'use strict';
    const canvas = document.getElementById('graphCanvas');
    if (!canvas) return;
    const el = id => document.getElementById(id);
    const svgNS = 'http://www.w3.org/2000/svg';
    const controls = ['graphLimit', 'graphRelation', 'graphNeighborhood', 'graphGameMode', 'graphTimer', 'graphExample'];
    let data;
    let selected = 6;
    let positions = new Map();
    let nodeElements = new Map();
    let edgeElements = [];
    let game;
    let round = 0;
    let hints = 0;
    let remaining = null;
    let deadline = null;
    let clock;
    let drag;
    let suppressClick = false;
    const view = { x: 0, y: 0, scale: 1 };
    const active = () => game && ['playing', 'paused'].includes(game.status);
    const hiddenAnswers = () => active() && game.mode === 'sweep';

    function svg(tag, attributes = {}, text) {
        const element = document.createElementNS(svgNS, tag);
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function relationNote() {
        const notes = {
            factor: 'A line means: multiply the smaller number by one prime to get the larger. Example: 6 × 2 = 12. You may follow a line in either direction.',
            shared: 'A line means: both numbers have a building block in common. Example: 6 and 9 share the factor 3. The side panel gives their largest shared factor.',
            gap: 'A line joins neighboring primes: no prime lies between them. Example: 7 and 11 have a gap of 4. Other numbers stay on the map without lines.'
        };
        el('graphRelationNote').textContent = hiddenAnswers()
            ? 'Challenge view: all circles look alike and connections are hidden. Find primes by checking their divisors. A prime has exactly two: 1 and itself.'
            : notes[data.relation];
    }

    function arrange() {
        positions = new Map();
        if (el('graphLayout').value === 'grid') {
            const columns = Math.ceil(Math.sqrt(data.limit * 1.4));
            const rows = Math.ceil(data.limit / columns);
            data.nodes.forEach((node, i) => positions.set(node.value, {
                x: 65 + (i % columns) * (670 / Math.max(1, columns - 1)),
                y: 60 + Math.floor(i / columns) * (460 / Math.max(1, rows - 1))
            }));
        } else {
            const inner = Math.ceil(data.limit / 3);
            data.nodes.forEach((node, i) => {
                const inside = i < inner;
                const index = inside ? i : i - inner;
                const count = inside ? inner : data.limit - inner;
                const angle = index / count * Math.PI * 2 - Math.PI / 2;
                positions.set(node.value, {
                    x: 400 + Math.cos(angle) * (inside ? 150 : 335),
                    y: 290 + Math.sin(angle) * (inside ? 115 : 235)
                });
            });
        }
        paintPositions();
    }

    function paintPositions() {
        for (const [value, element] of nodeElements) {
            const point = positions.get(value);
            if (point) element.setAttribute('transform', `translate(${point.x} ${point.y})`);
        }
        edgeElements.forEach(({ edge, element }) => {
            const a = positions.get(edge.from);
            const b = positions.get(edge.to);
            if (!a || !b) return;
            for (const [key, value] of Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })) element.setAttribute(key, value);
        });
    }

    function transformView() {
        el('graphScene').setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.scale})`);
        el('graphZoomLabel').textContent = `${Math.round(view.scale * 100)}%`;
    }

    function resetView() {
        Object.assign(view, { x: 0, y: 0, scale: 1 });
        transformView();
    }

    function build() {
        data = PrimeGraph.graph(Number(el('graphLimit').value), el('graphRelation').value);
        canvas.dataset.dense = String(data.limit > 24);
        selected = Math.min(selected, data.limit);
        el('graphNodeInput').value = String(selected);
        el('graphNodeInput').setAttribute('aria-invalid', 'false');
        el('graphError').textContent = '';
        const edges = el('graphEdges');
        const nodes = el('graphNodes');
        const list = el('graphNodeList');
        edges.replaceChildren();
        nodes.replaceChildren();
        list.replaceChildren();
        edgeElements = [];
        nodeElements = new Map();
        data.edges.forEach(edge => {
            const element = svg('line', { class: 'graph-edge' });
            edges.append(element);
            edgeElements.push({ edge, element });
        });
        data.nodes.forEach(node => {
            const group = svg('g', { class: 'graph-node', 'data-value': node.value, tabindex: 0, role: 'button' });
            group.append(svg('circle', { r: 23 }), svg('text', { y: 1 }, String(node.value)), svg('text', { y: 13, class: 'node-type' }));
            group.addEventListener('click', () => {
                if (!suppressClick) choose(node.value);
            });
            group.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    choose(node.value);
                } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
                    event.preventDefault();
                    const point = positions.get(node.value);
                    point.x = Math.max(45, Math.min(755, point.x + (event.key === 'ArrowRight' ? 12 : event.key === 'ArrowLeft' ? -12 : 0)));
                    point.y = Math.max(45, Math.min(535, point.y + (event.key === 'ArrowDown' ? 12 : event.key === 'ArrowUp' ? -12 : 0)));
                    paintPositions();
                }
            });
            nodeElements.set(node.value, group);
            nodes.append(group);
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.value = node.value;
            button.textContent = node.value;
            button.addEventListener('click', () => choose(node.value));
            list.append(button);
        });
        arrange();
        resetView();
        refresh();
    }

    function refresh() {
        const blind = hiddenAnswers();
        const connected = new Set([selected]);
        const adjacent = data.edges.filter(edge => edge.from === selected || edge.to === selected);
        adjacent.forEach(edge => { connected.add(edge.from); connected.add(edge.to); });
        const neighborhood = el('graphNeighborhood').checked && !blind;
        let shown = 0;
        edgeElements.forEach(({ edge, element }) => {
            const near = edge.from === selected || edge.to === selected;
            const visible = !blind && (!neighborhood || near);
            element.style.display = visible ? '' : 'none';
            if (visible) shown++;
            element.classList.toggle('is-connected', near);
            const route = game?.mode === 'path' && game.moves.some((v, i) => i > 0 &&
                ((v === edge.from && game.moves[i - 1] === edge.to) || (v === edge.to && game.moves[i - 1] === edge.from)));
            element.classList.toggle('is-route', Boolean(route));
        });
        for (const node of data.nodes) {
            const element = nodeElements.get(node.value);
            const collected = game?.mode === 'sweep' && game.found.includes(node.value);
            element.classList.toggle('is-prime', !blind && node.kind === 'prime');
            element.classList.toggle('is-unit', !blind && node.kind === 'unit');
            element.classList.toggle('is-selected', node.value === selected);
            element.classList.toggle('is-collected', Boolean(collected));
            element.classList.toggle('is-goal', game?.mode === 'path' && node.value === game.target);
            element.classList.toggle('is-dim', neighborhood && !connected.has(node.value));
            const label = `Number ${node.value}${blind ? collected ? ', collected prime' : '' : `, ${node.kind}`}`;
            element.setAttribute('aria-label', label);
            element.setAttribute('aria-pressed', String(node.value === selected));
            element.querySelector('.node-type').textContent = blind ? collected ? '✓' : '?' : node.kind[0].toUpperCase();
            const button = el('graphNodeList').querySelector(`[data-value="${node.value}"]`);
            button.setAttribute('aria-label', label);
            button.setAttribute('aria-pressed', String(node.value === selected));
        }
        el('graphStats').textContent = `${data.nodes.length} numbers · ${shown} visible connections`;
        el('graphLegend').textContent = blind ? '? = try this number · ✓ = prime collected' : 'P = prime · C = composite · U = unit';
        relationNote();
        inspect(adjacent);
        scoreBoard();
    }

    function inspect(adjacent) {
        const node = data.nodes[selected - 1];
        el('graphInspectorHeading').textContent = `Number ${selected}`;
        const connections = el('graphConnections');
        connections.replaceChildren();
        if (hiddenAnswers()) {
            el('graphNodeDetails').textContent = 'Detective mode: answers are hidden. A prime is greater than 1 and has no whole-number divisors except 1 and itself.';
            el('graphSelectionStatus').textContent = 'Choose circles or use the accessible node list to submit your answers.';
            connections.textContent = 'Connections return after the round.';
            return;
        }
        const divisors = Array.from({ length: selected }, (_, i) => i + 1).filter(d => selected % d === 0);
        el('graphNodeDetails').textContent = node.kind === 'unit'
            ? '1 is a unit, neither prime nor composite. Its only positive divisor is 1.'
            : `${selected} is ${node.kind}. ${node.kind === 'prime' ? 'Its only positive divisors are 1 and itself.' : `Prime building blocks: ${node.factors.join(' × ')} = ${selected}.`} Divisors: ${divisors.join(', ')}.`;
        el('graphSelectionStatus').textContent = `${adjacent.length} connections in this bounded graph. Numbers outside 1–${data.limit} are not shown.`;
        if (!adjacent.length) connections.textContent = 'No connections under this rule in the displayed range.';
        adjacent.forEach(edge => {
            const other = edge.from === selected ? edge.to : edge.from;
            const button = document.createElement('button');
            button.type = 'button';
            const explanation = data.relation === 'factor' ? edge.label : data.relation === 'shared'
                ? `${selected} and ${other}: largest shared factor ${edge.weight}`
                : `${selected} and ${other}: prime gap ${edge.weight}`;
            button.textContent = `${explanation} →`;
            button.setAttribute('aria-label', `${explanation}. Select ${other}`);
            button.addEventListener('click', () => choose(other));
            connections.append(button);
        });
    }

    function choose(value) {
        el('graphError').textContent = '';
        el('graphNodeInput').setAttribute('aria-invalid', 'false');
        if (active()) {
            if (game.status === 'paused') {
                el('graphGameFeedback').textContent = 'The round is paused. Resume when you are ready; no move was counted.';
                scoreBoard();
                return;
            }
            if (deadline !== null && performance.now() >= deadline) {
                expire();
                return;
            }
            const result = PrimeGraph.move(game, value);
            game = result.state;
            if (result.accepted || game.mode !== 'path') selected = value;
            el('graphGameFeedback').textContent = result.message;
            if (game.status === 'won') {
                finishClock();
                el('graphGameFeedback').textContent += ` Round complete! ${learningRecap()} You can explore the answers now.`;
            }
        } else {
            selected = value;
        }
        el('graphNodeInput').value = String(selected);
        refresh();
    }

    function learningRecap() {
        if (game.mode === 'sweep') return `You found all ${game.required.length} primes: each has exactly two positive divisors.`;
        if (game.mode === 'forge') return `${game.moves.join(' × ')} = ${game.target}. Repeated prime factors are allowed.`;
        return `You used ${game.moves.length - 1} moves. The shortest route has ${game.best}. Each edge adds or removes one prime factor.`;
    }

    function stopClock() {
        clearInterval(clock);
        clock = undefined;
    }

    function finishClock() {
        if (deadline !== null) remaining = Math.max(0, deadline - performance.now());
        deadline = null;
        stopClock();
    }

    function expire() {
        if (!game || game.status !== 'playing') return;
        game = { ...game, status: 'expired' };
        remaining = 0;
        deadline = null;
        stopClock();
        el('graphGameFeedback').textContent = `Time is up. No more moves are counted. ${answerRecap()} Try untimed mode to practice at your own pace.`;
        refresh();
    }

    function answerRecap() {
        if (game.mode === 'sweep') return `The primes are ${game.required.join(', ')}.`;
        if (game.mode === 'forge') return `${game.target} = ${PrimeGraph.factors(game.target).join(' × ')}.`;
        return `One shortest route: ${PrimeGraph.shortestPath(data, game.start, game.target, true).join(' → ')}.`;
    }

    function tick() {
        if (deadline === null) return;
        remaining = Math.max(0, deadline - performance.now());
        el('graphTime').textContent = `${Math.ceil(remaining / 1000)}s`;
        el('graphHudTime').textContent = el('graphTime').textContent;
        if (remaining === 0) expire();
    }

    function scoreBoard() {
        const playing = Boolean(active());
        controls.forEach(id => { el(id).disabled = playing; });
        el('graphPauseGame').disabled = !playing;
        el('graphEndGame').disabled = !playing;
        el('graphHint').disabled = !playing || game.status === 'paused';
        el('graphPauseGame').textContent = game?.status === 'paused' ? 'Resume' : 'Pause';
        el('graphStartGame').textContent = game ? 'New round ↗' : 'Start round ↗';
        el('graphQueryAction').textContent = playing ? 'Play number ↗' : 'Inspect ↗';
        el('graphGameHud').hidden = !game;
        if (!game) return;
        el('graphScore').textContent = Math.max(0, PrimeGraph.score(game) - hints * 5);
        el('graphMistakes').textContent = game.mistakes;
        el('graphTime').textContent = remaining === null ? 'Untimed' : `${Math.ceil(remaining / 1000)}s${game.status === 'paused' ? ' · paused' : ''}`;
        el('graphProgress').textContent = game.mode === 'sweep' ? `${game.found.length} / ${game.required.length}`
            : game.mode === 'forge' ? `${game.product} / ${game.target}` : `${game.moves.length - 1} moves`;
        el('graphGameTrail').textContent = game.mode === 'forge' ? `Your build: ${game.moves.length ? game.moves.join(' × ') : '1'} = ${game.product}`
            : game.mode === 'path' ? `Your route: ${game.moves.join(' → ')}` : `Collected primes: ${game.found.join(', ') || 'none yet'}`;
        el('graphHudObjective').textContent = el('graphGameObjective').textContent;
        el('graphHudFeedback').textContent = el('graphGameFeedback').textContent;
        el('graphHudScore').textContent = `Score ${el('graphScore').textContent} · ${el('graphProgress').textContent}`;
        el('graphHudTime').textContent = el('graphTime').textContent;
    }

    function startGame() {
        finishClock();
        hints = 0;
        const mode = el('graphGameMode').value;
        game = PrimeGraph.challenge(mode, Number(el('graphLimit').value), round++ % 1000001);
        remaining = Number(el('graphTimer').value) * 1000 || null;
        deadline = remaining === null ? null : performance.now() + remaining;
        el('graphRelation').value = 'factor';
        el('graphNeighborhood').checked = false;
        selected = mode === 'path' ? game.start : 1;
        el('graphGameObjective').textContent = mode === 'sweep'
            ? `Find all ${game.required.length} primes from 1 to ${game.limit}. Click a number to submit it. Remember: 1 is not prime.`
            : mode === 'forge' ? `Build ${game.target} from 1 by clicking prime factors. Example: to build 12, click 2, 2, then 3. Repeats are allowed.`
                : `Travel from ${game.start} to ${game.target}. Click a connected number: each move multiplies or divides by one prime. Do not use 1.`;
        el('graphGameFeedback').textContent = 'Your round has started. Pick a circle, or use the accessible number list.';
        build();
        if (deadline !== null) clock = setInterval(tick, 200);
        if (document.hidden) pause();
        el('graphGameHud').scrollIntoView({ block: 'start', behavior: 'instant' });
    }

    function pause() {
        if (game?.status !== 'playing') return;
        if (deadline !== null && performance.now() >= deadline) {
            expire();
            return;
        }
        finishClock();
        game = { ...game, status: 'paused' };
        el('graphGameFeedback').textContent = 'Paused. The clock is stopped and moves are locked. Press Resume when you are ready.';
        refresh();
    }

    el('graphPauseGame').addEventListener('click', () => {
        if (game?.status !== 'paused') return pause();
        game = { ...game, status: 'playing' };
        if (remaining !== null) {
            deadline = performance.now() + remaining;
            clock = setInterval(tick, 200);
        }
        el('graphGameFeedback').textContent = 'Resumed. Continue where you left off.';
        refresh();
    });
    el('graphStartGame').addEventListener('click', startGame);
    el('graphEndGame').addEventListener('click', () => {
        if (!active()) return;
        finishClock();
        game = { ...game, status: 'ended' };
        el('graphGameFeedback').textContent = `Round ended. ${answerRecap()} Explore the graph, or start a new round.`;
        refresh();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    window.addEventListener('pagehide', pause);
    el('graphHint').addEventListener('click', () => {
        if (game?.status !== 'playing') return;
        if (deadline !== null && performance.now() >= deadline) return expire();
        hints++;
        let hint;
        if (game.mode === 'sweep') {
            const prime = game.required.find(p => !game.found.includes(p));
            hint = prime < 4 ? `Try ${prime}. It has exactly two positive divisors: 1 and ${prime}.`
                : `Try ${prime}. No whole number from 2 through ${Math.floor(Math.sqrt(prime))} divides it. Checking up to its square root is enough.`;
        } else if (game.mode === 'forge') {
            const factor = PrimeGraph.factors(game.target / game.product)[0];
            hint = `You have ${game.product}. Try multiplying by ${factor}: it is a prime factor of the remaining ${game.target / game.product}.`;
        } else {
            const path = PrimeGraph.shortestPath(data, game.moves.at(-1), game.target, true);
            hint = `Try ${path[1]} next. ${Math.min(path[0], path[1])} × ${Math.max(path[0], path[1]) / Math.min(path[0], path[1])} = ${Math.max(path[0], path[1])}.`;
        }
        el('graphGameFeedback').textContent = `${hint} Hint used: −5 points.`;
        scoreBoard();
    });

    el('graphQuery').addEventListener('submit', event => {
        event.preventDefault();
        const input = el('graphNodeInput');
        const value = Number(input.value);
        if (!/^\d+$/.test(input.value.trim()) || !Number.isInteger(value) || value < 1 || value > data.limit) {
            input.setAttribute('aria-invalid', 'true');
            el('graphError').textContent = `Enter a whole number from 1 to ${data.limit} using digits only. The graph has not changed.`;
            input.focus();
            return;
        }
        choose(value);
    });
    function clearRound() {
        finishClock();
        game = undefined;
        hints = 0;
        remaining = null;
        el('graphScore').textContent = '0';
        el('graphProgress').textContent = '—';
        el('graphMistakes').textContent = '0';
        el('graphTime').textContent = 'Untimed';
        el('graphGameTrail').textContent = '';
        el('graphGameFeedback').textContent = 'Explore freely, or start a challenge.';
        el('graphGameObjective').textContent = 'Choose a mode, then start. The number-universe setting controls difficulty.';
    }
    ['graphLimit', 'graphRelation'].forEach(id => el(id).addEventListener('change', () => {
        clearRound();
        build();
    }));
    el('graphLayout').addEventListener('change', () => { arrange(); resetView(); });
    el('graphNeighborhood').addEventListener('change', refresh);
    el('graphExample').addEventListener('click', () => {
        clearRound();
        selected = 6;
        el('graphRelation').value = 'factor';
        el('graphNeighborhood').checked = true;
        build();
        el('graphSelectionStatus').textContent = 'Start with 6 = 2 × 3. In the list below, choose “6 × 2 = 12” to visit 12. One prime multiplication adds one building block.';
        el('graphCanvas').scrollIntoView({ block: 'center', behavior: 'instant' });
    });

    function zoom(multiplier) {
        const next = Math.max(0.6, Math.min(2.4, view.scale * multiplier));
        view.x = 400 - (400 - view.x) * next / view.scale;
        view.y = 290 - (290 - view.y) * next / view.scale;
        view.scale = next;
        transformView();
    }
    el('graphZoomIn').addEventListener('click', () => zoom(1.2));
    el('graphZoomOut').addEventListener('click', () => zoom(1 / 1.2));
    el('graphResetView').addEventListener('click', resetView);
    for (const [id, dx, dy] of [['graphLeft', 60, 0], ['graphRight', -60, 0], ['graphUp', 0, 60], ['graphDown', 0, -60]]) {
        el(id).addEventListener('click', () => { view.x += dx; view.y += dy; transformView(); });
    }
    function pointerPoint(event) {
        return new DOMPoint(event.clientX, event.clientY).matrixTransform(canvas.getScreenCTM().inverse());
    }
    canvas.addEventListener('pointerdown', event => {
        if (event.button !== 0 || drag) return;
        const group = event.target.closest('.graph-node');
        const value = group ? Number(group.dataset.value) : null;
        const point = pointerPoint(event);
        drag = { id: event.pointerId, value, origin: point, x: value === null ? view.x : positions.get(value).x, y: value === null ? view.y : positions.get(value).y, moved: false };
        suppressClick = false;
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
        if (!drag || drag.id !== event.pointerId) return;
        const point = pointerPoint(event);
        const dx = point.x - drag.origin.x;
        const dy = point.y - drag.origin.y;
        if (Math.abs(dx) + Math.abs(dy) < 6 && !drag.moved) return;
        drag.moved = true;
        canvas.classList.add('is-dragging');
        if (drag.value === null) {
            view.x = drag.x + dx;
            view.y = drag.y + dy;
            transformView();
        } else {
            positions.set(drag.value, { x: Math.max(45, Math.min(755, drag.x + dx / view.scale)), y: Math.max(45, Math.min(535, drag.y + dy / view.scale)) });
            paintPositions();
        }
    });
    function endDrag(event) {
        if (!drag || drag.id !== event.pointerId) return;
        const completed = drag;
        suppressClick = true;
        drag = undefined;
        canvas.classList.remove('is-dragging');
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        if (!completed.moved && event.type === 'pointerup' && completed.value !== null) choose(completed.value);
        setTimeout(() => { suppressClick = false; }, 0);
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    build();
})();
