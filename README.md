# Indivisible

A multi-page, interactive guide to prime numbers, from first principles to open
questions in number theory. Built with plain HTML, CSS, and JavaScript: no build
step, package installation, or backend is required.

## Explore

| Page | Content |
| --- | --- |
| [Overview](docs/index.html) | Guided learning levels, applications, visual atlas, and research |
| [Level 01: Foundations](docs/foundations.html) | Why primes, factor trees, GCD/LCM, proof workshop, history, first 168 primes |
| [Level 02: Exploration](docs/explore.html) | Records, algorithm tabs, prime families, gaps, factoring, and certificates |
| [Level 03: Deep math](docs/advanced.html) | Modular clocks, Euler products, progressions, p-adics, L-functions, open problems |
| [Applications](docs/applications.html) | Teaching-only RSA, finite fields, QR codes, computing, post-quantum standards |
| [Visual atlas](docs/visuals.html) | Prime density, sliding windows, Ulam spirals, and Goldbach pairs |
| [Research desk](docs/research.html) | Sourced 2024–2026 findings, ongoing research, limitations, and paper-reading guidance |
| [Playground](docs/playground.html) | Graph explorer, three learning games, animated sieve, exact divisors and neighboring primes |
| [Resources](docs/resources.html) | Searchable topic map, glossary, study paths, and primary sources |

## Repository structure

```text
docs/                    All HTML pages; deploy and serve this directory
  assets/
    css/styles.css       Shared visual system and responsive styles
    images/prism.svg     Original artwork
  scripts/
    math.js              Exact primality, neighbors, divisors, modular powers
    app.js               Navigation, tabs, directory, sieve, analyzer UI
    lessons-math.js      Pure, bounded calculations for teaching experiments
    lessons.js           SVG/DOM renderers and controls for those experiments
    graph-math.js        Pure graph construction, pathfinding and challenge rules
    graph-lab.js         Graph workspace, dragging, inspection and game lifecycle
tests/                   Dependency-free Node.js regression tests
.github/                 CI and deployment templates
AGENTS.md                Contributor and agent maintenance instructions
README.md                Setup, curriculum, validation, and deployment
```

All HTML is kept together in `docs/`; scripts and assets have their own folders.
There is intentionally no duplicate root `index.html`. Existing page URL names
are unchanged when `docs/` is served as the web root.

See [AGENTS.md](AGENTS.md) before changing mathematical contracts, research
snapshots, navigation, or repository structure.

## Run locally

Open [docs/index.html](docs/index.html) directly in a modern browser, or run this
command from the repository root with Python 3:

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory docs
```

Then open <http://127.0.0.1:8765>. Stop the server with Ctrl+C.

For any static host, set the publish directory to `docs/`. Serving the repository
root no longer opens the homepage automatically.

For GitHub Pages, use **Settings > Pages > Deploy from a branch > main /docs**.
The homepage is `docs/index.html`, but its public URL remains
<https://unigalactix.github.io/Indivisible/>. The `.nojekyll` marker keeps this a
plain static site. No custom Actions workflow is needed for branch publishing.

An optional [Actions deployment template](.github/pages.yml.example) also uploads
`docs/` as its artifact. To use it instead, authorize `workflow` access, move it to
`.github/workflows/pages.yml`, select **GitHub Actions** in Pages settings, and run
it. Do not activate both deployment approaches. The templates do not run until
explicitly enabled.

## Interactive lessons and their limits

There are 11 computed teaching experiments in addition to the sieve/analyzer:

| Experiment | Inputs and output |
| --- | --- |
| Factor tree | Integers 2–10,000; prime leaves, divisor-count rule, totient |
| Euclidean algorithm | Positive integers up to 10,000; exact steps, GCD and LCM |
| Prime counting | Up to 100,000; exact endpoint count and sampled curve versus x/ln(x) |
| Prime windows | Exactly 100 integers, within 1–100,000; primes and internal gaps |
| Ulam spiral | Odd grids through 61 × 61; computed positions and inspectable numbers |
| Modular clock | Moduli 2–12, steps 1–20; reachable residues and inverse table |
| Toy RSA | Distinct small primes; exact integer-message encryption/decryption round trip |
| Goldbach pairs | Even integers 4–2,000; every unordered prime-pair representation |
| Residue classes | Moduli 2–20; all primes through 1,000 separated into remainder classes |
| Euler product | Real s from 1.2–4, cutoff 10–1,000; finite sum/product and series tail bound |
| Short-interval scale | Illustrative powers 10^6–10^18; comparison of exponent thresholds |

Graphics have text equivalents, limits, error messages, and explanatory notes.
Floating-point approximations are labeled; they are not primality proofs.
Goldbach examples are finite evidence, not a proof of the conjecture. The real
zeta experiment is not a simulation of complex zeros. **Toy RSA is deliberately
insecure and must not be used for real data.**

## Playground behavior

### Graph lab and games

The graph-database-inspired workspace is entirely client-side: it does not query
an actual graph database. Its universe is the integers 1-12, 1-24, 1-36, or 1-48.
Start with the guided **6 connects to 12** example. A circle is a number; a line
is a mathematical relationship explained in the side panel.

- **Multiply by one prime:** an edge connects a to b when b/a is prime (a < b).
  It is not the graph of every possible divisibility relationship.
- **Share a building block:** numbers connect exactly when their GCD exceeds 1.
- **Neighboring primes:** only consecutive primes in the displayed range connect.
  The inspector gives the difference; composites remain as unconnected nodes.
- Select or drag nodes; pan the background; use zoom, pan and reset buttons.
  Orbits and grid layouts are deterministic rather than physics simulations.
  A selected-neighborhood filter reduces clutter.
- Keyboard users can select nodes with Enter/Space and move them with arrow keys.
  An accessible list provides the same selections without dragging. Node classes
  have text labels as well as colors.

Three games use that same graph:

| Game | Goal |
| --- | --- |
| Prime sweep | Find all primes; types, edges and inspector answers are hidden until the round ends |
| Factor forge | Multiply selected prime factors to assemble a target; repeated factors are allowed |
| Path quest | Follow prime multiplication/division edges to a goal without using 1 |

Untimed learning is the default; optional 60/120-second rounds can be paused.
Leaving the tab pauses the round and clock. Starting a new round clears the old
timer and progress; the targets rotate. Wrong answers give an explanation rather
than silently failing. Hints cost 5 points. Scores stay only in memory for this
tab; no personal information, leaderboard, storage or backend is used.

Collected primes/factors earn 10 points and completion earns 100; errors cost 5.
Path points are awarded only for completion, with a 5-point penalty for each step
beyond the shortest route. Hints cost 5 and scores cannot be negative. Duplicate
prime collection and traversal loops cannot farm points. Ending or timing out
reveals answers, and no further moves score.

### Existing number tools

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
node --check docs/scripts/app.js
node --check docs/scripts/math.js
node --check docs/scripts/lessons.js
node --check docs/scripts/lessons-math.js
node --check docs/scripts/graph-math.js
node --check docs/scripts/graph-lab.js
```

The tests cover exact divisors and neighbors, exhaustive small-number checks,
large primes and semiprimes, pseudoprimes, input boundaries, cancellation,
published gap examples, teaching-lesson invariants, RSA round trips for every
message in selected small moduli, graph edge correctness, shortest paths, game
completion/scoring invariants, and local page/asset/anchor references.

For browser validation, exercise each form with defaults, changed values, invalid
inputs and recovery. Check keyboard interaction, calculator cancellation, and
layouts at 320, 390, 768 and 1440 pixels (compare document scroll width to client
width, not the outer viewport). Test file links and served links after moving files.

A ready-to-enable GitHub Actions configuration is included at
[.github/ci.yml.example](.github/ci.yml.example). It runs syntax checks and the same
tests on pushes to `main` and pull requests. It is not active yet because the
publishing GitHub token does not have the `workflow` scope.

To enable it, authorize a token with `workflow` access, then move the template to
`.github/workflows/ci.yml` and commit that change.

## Content and design

Record tables are dated snapshots checked on **October 7, 2026**, not live feeds.
Sources are linked on the relevant pages and collected in
[the reference desk](docs/resources.html#sources). Research notes distinguish
published theorems, verified computations, open questions, and heuristic
illustrations. This is a curated and expandable guide, not an exhaustive survey
of every prime-number result.

To update a research note, verify the original paper/project announcement, record
the publication status and date, explain what changed and what did not, and update
every dependent snapshot and source link. Do not turn unverified summaries or
proposed proofs into established facts.

The visual direction takes inspiration from
[FANCY's Quantum landing-page concept](https://dribbble.com/shots/27370382-Quantum-Tokenomics-Website-Design-Web3-Landing-Page-3D-UI).
The site layout, educational content, and geometric SVG illustration were created
for Indivisible; no artwork was copied from the reference.

All calculator processing stays in the browser. Google Fonts is the only
externally loaded presentation resource; system fonts are used if unavailable.
