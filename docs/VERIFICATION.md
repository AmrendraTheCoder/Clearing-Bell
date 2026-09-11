# Integration verification — 11 September 2026

## Environment

- Upstream cloned at commit `e614659` into this repository directory.
- Frontend copied from the existing standalone workspace; original kept unchanged.
- Node 22.21, Vite 8, React 19, viem, Foundry and local Anvil.
- Network: loopback Anvil, chain 31337. No external-chain writes or production hosting performed.

## Contract defects fixed

1. Clearing demand did not decrease correctly at higher ask prices, allowing invalid clearing results.
2. Insertion sort underflowed when a new bid sorted before the first element.
3. Revoked identities affected clearing price/quantity before exclusion from settlement.
4. Independent per-order payment flooring could underfund settlement or leave residual cash for fractional quantities.

Regression coverage: `contracts/test/ClearingRegression.t.sol` and additions to `contracts/test/AuctionEngine.t.sol`.

## Automated checks

- 66 unique Solidity tests passed, including 256 runs for each fractional-settlement and clearing fuzz test.
- 50 frontend tests passed with local integration enabled (49 unit/config/navigation/SEO + 1 read-only chain integration).
- TypeScript production compilation and ESLint passed.
- Vite production bundle generated. Three.js remains a large but separately lazy-loaded chunk; it loads only when its schematic approaches the viewport.
- Dependency install audit: no reported vulnerabilities at installation time.

## Browser flow verified against actual local contracts

| Check | Observed result |
| --- | --- |
| Browse | Open and closed rounds read from deployed engine |
| Investor connection | Registry eligible; 1,040 CBB28 and 246,030 USDC before trade |
| Approval | Exact 1,000 USDC allowance confirmed in block 67 |
| Order | Buy 10 CBB28 at limit 100 appeared in round 2; transaction confirmed in block 68 |
| Portfolio before close | One outstanding order and historical round 1 receipt |
| Issuer close | Round 2 closed with 30 matched bonds at 99.38 USDC; block 69 |
| Portfolio after close | 1,050 CBB28; 245,036.2 USDC; new 10-bond settlement receipt; no outstanding order |
| New round | Issuer opened round 3 through validated token/window form |
| Pause | New-round control disabled after pause confirmation |
| Resume | New-round control reenabled after resume confirmation |
| Restricted wallet | Registry ineligible; approve and submit disabled; issuer console read-only |

Transaction hashes, balances and rounds are local test-chain records, not fictitious UI values. Fresh seeding creates a new deployment with new addresses; block numbers above describe the verification run, not fixed test expectations.

## Remaining release gates

This verification does not certify a production financial product. External EIP-1193 wallet signature/rejection and Hedera deployed-contract flows require a configured external deployment and user wallet. Local fixtures do not implement real KYC or token issuance. Uniswap real PoolManager behavior, production RPC scale, non-escrow settlement liveness and independent contract review remain release gates. See the architecture and local-contract notes.

## Interface refinement and chart pass

- Rebuilt Home, graph-first Markets, Auction workspace, wallet sheet and Issuer console. Existing portfolio accounting view and real transaction adapter retained.
- One shared SVG chart supplies cumulative depth and order-volume modes, exact bigint price-level aggregation, pointer/keyboard inspection, and an accessible values table. Final-price guide is a recorded closed-round value, never fabricated price history.
- Procedural 3D remains optional in Markets and visible on Home; reduced-motion/2D fallback and on-demand rendering retained. The optional scene now has real quantity/price labels and a neutral graphite/silver finish.
- After these changes: `RUN_CHAIN_TESTS=1 npm run check` passed 66 Solidity tests and 45 frontend/integration tests, TypeScript production build and ESLint. Default frontend run passes 44 and skips the explicit local-chain read check.
- Browser1440×900 and390×844: no horizontal document overflow in inspected Home, Markets, Auction and Issuer layouts. Tables retain internal scrolling.
- Verified directory Closed filter, no-result search/Clear filters, oldest/newest sorting, real round selection, native How it works anchor, mobile navigation, wallet test-account connection, issuer/nonissuer action visibility, and invalid zero-minute auction window blocking submission.
- Verified volume-mode keyboard inspection: at100 USDC, bid volume20 CBB28 and ask volume0. Switching to closed round1 displays recorded99.25 USDC clearing. These reflect the current local seed, not production market activity.
- Replaced hash-only navigation with pathname routes and legacy link migration. Static initial HTML, unique metadata, factual shared FAQ, opt-in canonical/schema/sitemap, noindex operational pages, and unknown-page metadata covered by SEO/router tests.
- No public domain supplied: local HTML remains noindex, no fabricated canonical or sitemap. Public indexing/AI-answer visibility is not measured or claimed.
- Bundle warnings remain: main about202KB gzip and optional3D renderer about234KB gzip. SVG chart module about3.6KB gzip. These are build sizes, not network-latency or Core Web Vitals measurements.
- Served production-build verification: direct `/auction?round=1` loaded the closed round; selecting round2 and refreshing retained the new selection. Markets received its unique title and noindex metadata. No browser errors or warnings were recorded in that fresh production-preview tab. Preview server and temporary tab were closed after checking.
- Wallet keyboard check: Shift+Tab from Close wrapped to the last visible account control within the dialog; Escape dismissed it. Temporary viewport overrides were reset.
- Closed auctions now show a result card instead of a misleading active order form. Final lint and production build were rerun successfully after the result-card and 3D-label refinements.

## Spatial interaction and connection recheck

- Added bounded drag rotation, tilt and zoom tap controls, keyboard arrows/+/-/Home, reset, and opt-in presentation motion with play/pause. Pausing preserves the current angle; resizes and visibility changes preserve motion phase. No invented orders or animated price values.
- Motion is user-started, suspended offscreen/when the document is hidden, and disabled for reduced-motion preferences. Reduced motion still defaults to the existing 2D order book. Touch CSS preserves vertical scrolling and browser pinch zoom; tilt also has a single-tap alternative.
- Browser checks at1440×900 and390×844 verified desktop drag rotation, keyboard adjustments, tap controls, reset, play/pause, Escape closing adjustments and the actual-value 2D fallback. Main navigation controls measured44×44px; mobile document had no horizontal overflow. No browser errors/warnings recorded. Native touch hardware and OS-level reduced-motion emulation were not exercised in this pass.
- Rechecked all five routes, served configuration, five deployed contract bytecodes, issuer/compliance links, current rounds, actual balances/allowances and eligibility. Local chain31337 remained at block105; no new transactions or reseeding were needed for this pass.
- `RUN_CHAIN_TESTS=1 npm run check`:66 Solidity and50 frontend/integration tests passed. Five new pure navigation tests cover independent presets, bounds, normalized drag, all keyboard/tap mappings and bounded presentation motion. Main/optional3D chunks still exceed Vite's500KB raw-size warning threshold.
- Repository publication target is the user's public fork: `AmrendraTheCoder/Clearing-Bell`. The original repository remains configured as `upstream`; generated local manifests, environment files, dependencies and build output are excluded from Git.

## Portfolio and remembered wallet session

- Portfolio now prioritizes separate cash-token and bond balances, followed by open-order count and one switchable activity table. Exact balances, token addresses and allowances remain available in collapsed details. Distinct assets are never added into an invented portfolio valuation.
- Added 13 portfolio tests and 33 wallet-session regression tests. `RUN_CHAIN_TESTS=1 npm run check` passed 66 Solidity tests, 96 frontend/integration tests, ESLint, TypeScript and production build.
- Wallet preferences contain only deployment-scoped public account metadata. Reload restoration uses already-authorized accounts without startup permission prompts, chain switching or signing. Temporary provider outages retain reconnect intent; explicit disconnect clears it. All five transaction paths reject stale sessions after asynchronous preflight.
- Browser checks verified fresh-tab and full-reload restoration, explicit disconnect surviving reload, account-specific investor/seller balances and activity, and retained connection through Markets and Issuer navigation. No approvals, orders or other chain writes were performed in this pass.
- Desktop 1440×900 and mobile 390×844 checks showed large readable balances and no horizontal document overflow; detailed tables scroll internally. Investor balances were 246,030 USDC and 1,040 CBB28; seller balances were 253,970 USDC and 960 CBB28 with one open order. These are local fixture values, not production activity.
- External extension account/network/lock events are covered using controlled provider tests, not a real extension-signature session. Remembered intent cannot keep an extension unlocked or override revoked permissions. Already-submitted wallet requests cannot be cancelled by disconnecting.
- Main bundle remains about208KB gzip; optional Three.js chunk about236KB gzip. Vite's large-chunk warning remains. CSV download completion was not confirmed by the in-app browser download event in this pass.
