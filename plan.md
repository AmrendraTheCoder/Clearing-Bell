# Clearing Bell — Implementation Plan

## 17. Architectural Update: The Multi-Issuer Platform Transformation

**Status: core migration present; verification is not complete.**

The multi-issuer changes supplied by the project owner are present in GitHub commits `571842c` and `217ff53`, synchronized into this checkout on 12 September 2026. The overview below records the architectural transformation. Remaining limitations are listed separately; this is not a production-readiness or security certification.

### Why we did this

Originally, Clearing Bell was designed as a single-tenant system. `AuctionEngine` had a single `issuer` state variable, meaning only one company could operate a deployed instance of the engine to auction its bonds. Furthermore, `ComplianceGate` and `BondConfig` relied on `onlyOwner` and `onlyDeployer` modifiers, centralizing control in the platform's deployer wallet. If a new company wanted to issue a bond, the deployer had to manually configure its compliance registry, creating a bottleneck and a non-scalable operating model.

The architecture has moved to a **Hybrid Multi-Issuer Platform (Curated Model)**: a central platform where multiple companies can launch and manage their own bonds, while the platform admin curates and whitelists those companies.

### What changed across the stack

#### 1. `AuctionEngine.sol` — the core

- **Removed single tenancy:** removed the global `issuer` address.
- **Added multi-tenancy:** introduced `mapping(address bondToken => address issuer) public bondIssuers` to track the company responsible for each bond token.
- **Platform admin curation:** introduced a `platformAdmin` role, initialized from the constructor's admin argument (the deployer in the supplied setup), controlling `registerBondIssuer(bondToken, issuer)` to whitelist companies and their bonds.
- **Dynamic authorization:** `openRound` now uses `onlyBondIssuer(bondToken)`. `closeAndClear` resolves the bond from the stored round and checks its registered issuer for early closing; anyone can still trigger clearing after the deadline. It is not an issuer-only close at all times.
- **Separate controls:** the platform admin retains global pause and bid-relayer controls; registered issuers have per-bond pause controls.

#### 2. `ClearingBellHook.sol` — Uniswap integration

- Updated the Uniswap V4 hook to respect bond-specific issuer ownership.
- `afterEpochClose()` and `setActiveRound()` query `AuctionEngine.bondIssuers` to verify that the caller is the issuer for the supplied bond pool.
- The testnet hook variant uses the same bond-specific authorization lookup.

#### 3. `ComplianceGate.sol` — issuer-managed compliance

- Removed the `onlyOwner` deployer bottleneck from bond registry registration.
- Integrated an `IAuctionEngine` interface to read permissions dynamically.
- `registerRegistry()` now authorizes the platform admin or the registered issuer of the specified bond: `msg.sender == platformAdmin || msg.sender == issuer`.
- Individual bond issuers can register their Hedera ATS identity registries without requiring the platform admin to configure every registry manually. The deployer still performs the one-time central engine binding through `setAuctionEngine()`.

#### 4. `BondConfig.sol` — multi-tenant configuration

- Refactored the single address bundle into `mapping(address => BondDetails) public bondConfigs`.
- `configure()` queries the supplied auction engine's `platformAdmin()` and `bondIssuers(bondToken)` for authorization; `setHook()` uses the engine stored for that bond.
- Identity registry, compliance gate, auction engine, hook and settlement-token addresses are stored per bond rather than overwriting one global address bundle.
- Bond metadata constants remain shared in the current implementation. Binding authorization to a trusted central engine, rather than trusting a caller-supplied engine, remains a security-review gate.

#### 5. Frontend application — session and data layer

- Replaced the global `issuer()` lookup with `platformAdmin()` and `bondIssuers(selectedRound.bondToken)` in `chain.ts` and updated the frontend ABI and snapshot types.
- The session implementation is `frontend/src/context/DemoSession.tsx`, with its context type in `DemoSessionContext.ts`; this corresponds to the supplied description's `DemoSessionContext.tsx`.
- `isIssuer` now compares the connected wallet with the registered issuer of the selected round's bond. `isPlatformAdmin` separately identifies the platform curator.
- The interface includes platform-admin guidance and bond-issuer labels. UI visibility reflects permissions but never replaces on-chain authorization; full tenant-specific workflow verification remains necessary.

### Result

The core architecture supports multiple curated bond issuers through a shared auction engine. The platform admin retains whitelisting power, while registered companies can manage their own bond lifecycle, registry and configuration without deployer intervention for each operation. This autonomy remains subject to platform-admin powers and the implemented access-control policy; it is not an unqualified claim of permissionless operation or proven scalability.

### Deployment and verification notes

- Local root `.env` contains private operator/deployer credentials and the supplied deployment outputs. `frontend/.env.local` contains only the public testnet settings. Both files are Git-ignored and have owner-only permissions. Unknown registry/hook outputs remain blank; no credential is included in this plan.
- The supplied engine at `0x90ab5537d8b2131519a9af560959d0a59bb69974` has deployed code on chain296. Read-only `platformAdmin()` and `bondIssuers()` calls succeed; the retired `issuer()` getter reverts. Syncing the newer frontend removes its dependency on that retired getter. Getter checks alone do not verify every deployed contract against source.
- Preserve clearing, compliance, fractional-settlement and wallet-session regressions. Add explicit issuer-A/issuer-B isolation tests, unregistered-bond rejection, admin curation, engine-binding validation and round-to-bond hook validation.
- Bring all deployment scripts and local fixtures into alignment with the new constructors, engine binding and bond registration. Do not assume an existing single-issuer local deployment is compatible with the new frontend.
- Review tenant-specific UI actions, first-round onboarding, global versus per-bond pause authority, and issuer replacement with open rounds before claiming full workflow readiness.
- This environment/documentation update does not deploy contracts, submit orders, approve tokens or send any transaction.

### Verification snapshot — 12 September 2026

- Frontend:100 tests passed, one optional local-chain test skipped; ESLint, TypeScript and production build passed. The generated build was scanned against the supplied private credentials with zero matches.
- Browser: the issuer console reads Hedera testnet chain296, a current block and zero auction rounds from the supplied engine. `ACTIVE_ROUND_ID=1` is a local script setting, not evidence that round1 already exists. No browser wallet was connected and no transaction was requested.
- Contracts:18 clearing tests passed; four suites failed during setup with `EngineNotSet()`. Their fixtures register a compliance registry before binding the new auction engine, so the affected behavioral tests did not execute.
- Known isolation weakness: `BondConfig.configure()` trusts its caller-supplied engine to identify the admin/issuer before replacing a bond configuration. A hostile engine could claim that the caller is authorized. Bind this check to a trusted authority and add negative tests before treating tenant isolation as secure.
- Remaining integration gaps: hook setters need round-to-bond validation; issuer UI pause still targets the global admin-only action; first-round creation cannot infer a bond issuer when no round exists; local deployment and hook scripts retain outdated setup/signatures. These issues were recorded, not changed by the environment/documentation task.
