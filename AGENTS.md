# Indivisible maintenance guide

Project-wide instructions for contributors and coding agents. See [README.md](README.md)
for local setup, test commands, deployment, and the curriculum.

## Architecture

- All page HTML belongs directly in `docs/`, the deployable web root.
- Styles belong in `docs/assets/css/`; original images and SVGs in
  `docs/assets/images/`. Do not scatter presentation assets in the repository root.
- JavaScript belongs in `docs/scripts/`. `math.js` is the exact analyzer engine;
  `lessons-math.js` contains bounded, pure teaching calculations. Keep DOM work in
  `app.js` and `lessons.js`, not in the math modules.
- Keep tests in `tests/` and GitHub configuration in `.github/`.
- This is a dependency-free static site, not a framework application. Preserve
  relative URLs and direct-file compatibility. Serve `docs/`, not the repository
  root. No production build is required.
- GitHub Pages uses the `main` branch's `/docs` folder. Keep `docs/index.html`
  and `docs/.nojekyll`; do not restore a duplicate root homepage or switch the
  publishing source without checking the live deployment.
- Keep primary content and navigation in HTML. Update every page's navigation
  together and retain an accurate `aria-current` state.

## Mathematical correctness

- Preserve the analyzer's inclusive input range: 1 through 100 trillion.
  Never round malformed inputs into valid integers.
- Distinguish the unit 1 from both primes and composites. Neighbor primes are
  strictly below/above the input. Handle the absence of a previous prime for 1
  and 2; a prime input's surrounding span combines two gaps.
- Use exact integer/BigInt calculations where exact results are promised.
  Document the valid range of deterministic primality bases. Never extend a
  bound without a proof and boundary tests.
- Label estimates, sampled curves, truncated series, toy cryptography, and
  analogies explicitly. A finite computation does not prove an infinite claim.
- Keep long computations cancellable and yield to the browser. Preserve every
  divisor, sorted and unique, rather than truncating a large result.
- Reuse existing math helpers. Keep independently computed reference results in
  tests so tests do not merely repeat the implementation.

## Research and curriculum

- Start with intuition, give a worked example, then offer optional deeper notes.
  Define new notation and state hypotheses. Link related levels and experiments.
- Date record snapshots and research notes. Prefer original papers, journal
  pages, project announcements, and standards bodies over news summaries.
- For research updates record authors, date, publication/preprint status,
  contribution, limitations, source, and relevance to learners.
- Verify claims in the primary source. Do not promote unreviewed proof claims
  or unverified AI-generated summaries to established results.
- Keep “proved,” “computationally verified,” “conjectural,” and “heuristic”
  distinct. Update dependent pages and source links when a record changes.
- RSA demonstrations are deliberately insecure teaching aids: small primes,
  no padding, no key generation, and no real user secrets. Do not present them
  as usable cryptographic implementations.

## UI and accessibility

- Follow the shared dark/lime visual system. Keep mobile navigation reachable.
- Each graphic needs a meaningful text summary or data table. Do not make color,
  hover, motion, or pointer use the only way to learn from an experiment.
- Label controls and units. Validate limits and display errors explicitly.
  Hide stale results on invalid input, not a success-shaped fallback.
- Preserve keyboard controls, visible focus, reduced-motion support, and live
  status announcements. Avoid page-level horizontal overflow at 320px.

## Validation and publishing

- Run `node --test` (Node.js 22+) and syntax-check all changed scripts. No package
  installation is needed.
- Verify local assets/anchors and script order after moving files or adding pages.
  Test mathematical edge cases and interactive controls, not only screenshots.
- Check desktop and mobile layouts, including long numbers and large result sets.
- Keep [README.md](README.md), this guide, and CI templates aligned with the
  repository structure and actual supported behavior.
- GitHub CI is a template until authorized `workflow` access is available.
  Do not claim a workflow or deployment is active just because a template exists.
- Commit/push only when requested. Verify the target repository and account;
  use repository-local identity settings rather than changing global settings.
  Never commit credentials, local browser artifacts, or unrelated user files.
