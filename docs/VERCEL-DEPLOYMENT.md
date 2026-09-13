# Vercel deployment

Production: https://clearing-bell.vercel.app

The deployed source is Vaibhav-Rawat-cipher/Clearing-Bell at `68fb65e`, with two frontend build fixes and Vercel configuration. The original Desktop/Clearing-Bell working copy is preserved separately. This checkout is Desktop/Clearing-Bell-upstream.

## Build

Deploy the `frontend` directory. Vercel project: `clearing-bell`, scope `amrendra-singhs-projects`. Install with `npm ci`; build with `npm run build`; output is `dist`. `vercel.json` preserves per-route HTML for the four application routes and forwards `/rpc` to the public Hedera testnet RPC. Production and preview builds use the public HTTPS proxy below. Local development uses `http://127.0.0.1:5173/rpc` through Vite's development proxy; that loopback address must never be bundled into the public deployment.

## Public environment

These values are intentionally public and are stored in the Vercel project. No operator or deployer keys are required for web hosting. Wallets sign user transactions in the browser.

```dotenv
VITE_RPC_URL=https://clearing-bell.vercel.app/rpc
VITE_CHAIN_ID=296
VITE_NETWORK_NAME=Hedera Testnet
VITE_EXPLORER_URL=https://hashscan.io/testnet
VITE_AUCTION_ENGINE_ADDRESS=0x663d1825f7a1eb323eb531152e23720c7f2ad7a2
VITE_DEPLOYMENT_BLOCK=40430000
VITE_SITE_URL=https://clearing-bell.vercel.app
```

The selected engine is documented in the repository's walkthrough and current demo scripts. Read-only checks verified `issuer`, `nextRoundId` (20 at verification), and `complianceGate`. The previously supplied `0x90ab…9974` engine does not implement the `issuer()` interface required by this version and was not used.

## Verification and limits

- Frontend build and lint pass after correcting the optional `refresh(force)` context signature and a `const` declaration.
- 100 frontend tests passed; one local-chain integration test skipped.
- This is a frontend deployment connected to existing Hedera testnet contracts, not a new smart-contract deployment or security audit.
- No wallet transaction was signed or submitted during deployment verification.
- Settlement history scanning starts at the user-supplied block `40430000`. Initial wallet history loading depends on the distance to the current head and public RPC limits; a complete history scan was not validated by the deployment check.

Redeploy from `frontend` with `vercel deploy --prod`. Never upload root `.env`, deployment keys, or operator credentials. `.vercelignore` excludes environment files, dependencies, tests, and local build output.
