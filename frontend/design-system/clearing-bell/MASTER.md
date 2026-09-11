
# Clearing Bell — Interface system
Updated 11 September 2026

## Direction

An institutional auction workspace with spatial character: carbon, graphite, silver and a restrained mint accent. Hedera is the intended network, not an endorsement. The connected deployment is always disclosed separately.

Homepage: concise purpose → physical bond certificate/order depth → actual market snapshot → auction mechanics → product entry points → factual FAQ. Markets and operations are graph-first; 3D is optional and never replaces exact values. Portfolio retains its established light accounting surface.

## Visual foundations

- Carbon background: #0b0d11; raised surface: #11151a; keylines: #2a3038.
- Primary text: #f1f4f3; secondary: #a0a9b3; action/bid mint: #bef4ce.
- Asks use slate blue plus a dashed chart stroke, not color alone.
- IBM Plex Sans for headings, controls and body. Plex Mono for addresses and data. Self-hosted WOFF2 with swap.
- Headlines are restrained on operational pages. Large text belongs on the landing page.
- Body14–17px; supporting metadata11–12px; dense landing eyebrow9–11px. Do not put essential instructions in small decorative labels.
- Most controls44–52px high. Workspace panels have6–8px radii; wallet sheet12px.
- No artificial live counters, bloom, random particles, synthetic price history, ornamental candlesticks or unlabeled chart columns.

## Header and navigation

Brand / limited navigation / one account or app action.
Home: Markets, How it works, Launch app.
Workspace: Markets, Portfolio, Issuer, Connect wallet or account.
Network labels do not occupy the header; errors and pending transactions remain visible when actionable.

Use real pathname links via ViewLink. Modified clicks retain native browser behavior. Legacy hash routes normalize to clean paths. Native section anchors keep normal scrolling. Auction links include an exact round query for new-tab or direct access.

## Component: AuctionDepthChart

Shared by Markets, Auction and Issuer. One bigint model aggregates exact price levels; only normalized plotting coordinates use floating-point numbers.

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| round | LiveRound or null | required | Actual submitted orders and recorded result |
| compact | boolean | false | Smaller chart for embedded round panels |

Depth mode plots cumulative bids at/above price and asks at/below price. Order volume shows quantities at each submitted limit. The recorded clearing guide appears only for closed rounds with a recorded price.

States: meaningful empty state, depth/volume selection, pointer inspection, keyboard range inspection, exact-value disclosure, recorded/no-crossing/pending clearing. No predictive fill claim: changed eligibility can alter settlement.

Accessibility: SVG title/description, labelled axes and units, solid/dashed series distinction, keyboard range control with values, exact HTML data table. On narrow screens use fewer ticks; do not crop terminal tick labels.

Use:
`<AuctionDepthChart round={round} compact />`

## Component: MarketDepth

Shared spatial rendering; `round` is actual LiveRound or null; `variant` is hero or market. Hero adds a brushed-metal certificate. Actual limit prices position bars, quantities determine height. Bars may be aggregated into at most12 price bins per side. Never add filler orders to make a scene fuller.

Isometric, Front and2D controls. HTML totals remain readable outside WebGL. Reduced motion defaults to2D, lazy loading occurs near viewport, rendering runs on demand, DPR capped1.5. Fallback shows actual order rows. No downloaded community assets or third-party texture dependencies.

## Component: WalletDialog

No props; consumes the existing session. Reuses Dialog for accessible modal behavior and AddressLink for real identifiers.

- Primary browser-wallet connection, no invented wallet providers.
- Connected account with copy, eligibility and disconnect.
- Explicitly labelled, collapsed local test-account disclosure. Role-specific glyphs; five compact rows when configured.
- Per-action pending feedback, inline errors, wrong-network switch, locked account actions during transactions.
- One scrolling sheet, including mobile. No nested giant account-list scroller.
- Connecting does not move funds or grant approval.

Default/hover/disabled/pending/error states are styled deliberately. Interactive rows must explicitly reset browser-native button backgrounds.

## Patterns

- Auction: compact instrument header, round selector and four relevant values; graph + actual order book; order composer; settlement and contract evidence.
- Issuer: concise authority/action header; actual summary; selectable round monitor with the same graph; filtered register; contract records. Authorized open/pause/resume actions retain validation and confirmation.
- Forms: labelled units, exact token parsing, disabled invalid submissions, pending signature/confirmation states, explicit settlement consequences.
- Tables: semantic headings and captions; horizontal scrolling inside the table wrapper, not the page.
- Dialog: Escape, visible-control focus containment (including links and summary), restored focus and scroll lock. Do not reset focus on background refresh.
- Real loading/error/empty states never insert demonstration data.

## SEO and AI-readable content

Public informational pages have unique descriptions, semantic content and crawlable links. The static build exports initial HTML for every route. Home overview and FAQs share their factual source with build-time content.

Local/default builds are noindex. A valid production HTTPS VITE_SITE_URL enables canonical URLs, factual structured data and sitemap entries for Home and Markets. Auction, Portfolio and Issuer stay noindex. Hosts must serve generated route documents and404, not silently serve homepage metadata for every path.

No fake review schema, offers, rankings or unsupported promises. No claimed SEO/GEO score; public discovery requires an actual deployment and separate validation.

## Verification and limits

See docs/VERIFICATION.md for current automated and browser evidence. Browser checks covered1440px desktop and390px mobile, graph inspection/modes, actual round selection, directory filters, wallet access and issuer input validation.

Production bundles still flag large main/Three.js chunks. Splitting keeps the3D renderer off the default Markets path; it does not establish a Lighthouse/Core Web Vitals score. External-wallet signing, Hedera deployment, production indexing and independent contract review remain release gates.
