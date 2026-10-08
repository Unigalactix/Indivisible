# Indivisible

A multi-page, interactive guide to prime numbers, from first principles to open
questions in number theory. Built with plain HTML, CSS, and JavaScript: no build
step, package installation, or backend is required.

## Explore

| Page | Content |
| --- | --- |
| [Overview](index.html) | Choose a learning level and discover the playground |
| [Level 01: Foundations](foundations.html) | Primes, composites, units, history, and all 168 primes up to 1,000 |
| [Level 02: Exploration](explore.html) | Record holders, algorithm tabs, prime gaps, and twin primes |
| [Level 03: Deep math](advanced.html) | Zeta and musical harmonics, modular arithmetic, Fermat, and unsolved questions |
| [Playground](playground.html) | Animated sieve, exact divisor analysis, and neighboring primes |
| [Resources](resources.html) | A-Z glossary and mathematical sources |

## Run locally

Open `index.html` directly in a modern browser, or serve this directory with
Python 3:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8765>. Stop the server with Ctrl+C.

The site is static and can also be hosted on GitHub Pages. In the repository's
**Settings > Pages**, select **Deploy from a branch**, then **main / (root)**.
The included CI template validates the site; it does not enable or deploy Pages.

## Playground behavior

- The sieve visualizes integers 1-100, with selectable speed and a reset that
  cancels an active animation. It keeps 1 separate from composites.
- The analyzer accepts digit-only positive integers from **1 through
  100,000,000,000,000**, inclusive. It rejects decimals, signs, commas, exponent
  notation, zero, and out-of-range values rather than silently rounding them.
- Results identify a **Prime**, **Composite**, or **Unit**, and show every positive
  divisor in ascending order. Select a divisor to reveal its factor pair.
- The prime neighborhood shows the nearest prime **strictly below** and
  **strictly above** the input, both distances, and the span between the neighbors.
  For 1 and 2 there is no previous prime. When the input is itself prime, the
  surrounding span is the sum of two consecutive prime gaps, not a single gap.
- The next prime may exceed the input cap; it is displayed with an explanatory
  note. For 100 trillion, the neighbors are 99,999,999,999,973 and
  100,000,000,000,031, with distances 27 and 31 and a total span of 58.
- Divisors use exact integer factorization within JavaScript's safe-integer
  range. Long computations and large divisor renders yield to the browser.
  Changing the input cancels stale work.
- Neighbor tests use BigInt modular arithmetic and deterministic Miller-Rabin
  bases 2, 3, 5, 7, 11, 13, and 17. These bases are sufficient below
  341,550,071,728,321; the search is bounded below 200 trillion by Bertrand's
  postulate for inputs greater than 1.

Keyboard-accessible tabs, labeled inputs, live status messages, visible focus
states, and reduced-motion support are included. Layouts support mobile and
desktop screens.

## Tests

Use Node.js 22 or newer; there are no test dependencies to install:

```sh
node --test
node --check app.js
node --check math.js
```

The tests cover exact divisors and neighbors, exhaustive small-number checks,
large primes and semiprimes, pseudoprimes, input boundaries, cancellation,
published gap examples, and local page/asset/anchor references.

A ready-to-enable GitHub Actions configuration is included at
[.github/ci.yml.example](.github/ci.yml.example). It runs syntax checks and the same
tests on pushes to `main` and pull requests. It is not active yet because the
publishing GitHub token does not have the `workflow` scope.

To enable it, authorize a token with `workflow` access, then move the template to
`.github/workflows/ci.yml` and commit that change.

## Content and design

Record tables are dated snapshots checked on **October 7, 2026**, not live feeds.
Sources are linked on the relevant pages and collected in
[the reference desk](resources.html#sources).

The visual direction takes inspiration from
[FANCY's Quantum landing-page concept](https://dribbble.com/shots/27370382-Quantum-Tokenomics-Website-Design-Web3-Landing-Page-3D-UI).
The site layout, educational content, and geometric SVG illustration were created
for Indivisible; no artwork was copied from the reference.

All calculator processing stays in the browser. Google Fonts is the only
externally loaded presentation resource; system fonts are used if unavailable.
