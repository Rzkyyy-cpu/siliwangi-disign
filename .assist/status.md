# Status

## Phase
Foundation and ECDSA MVP UI are in progress.

## Completed

- Next.js TypeScript scaffold.
- Web Crypto SHA-256 and ECDSA P-256 core.
- Version 1 signature envelope.
- AES-GCM/PBKDF2 encrypted private-key vault module integrated into signing UI.
- PDF selection, metadata form, QR output, `.sig.json` download, and same-session verification UI.
- `.sig.json` import with runtime envelope validation.
- QR image import with `jsqr` decoding.
- QR camera scanning when browser permission is granted.
- Vault unlock/reuse from `localStorage`.
- Encrypted vault storage in IndexedDB with legacy localStorage migration.
- Key rotation with fingerprint change.
- Benchmark UI with downloadable JSON report.
- ML-DSA-44 and hybrid ECDSA + ML-DSA domain adapters.
- Multi-signer envelope domain module.
- Prototype `/api/verify` publish/get/verify route.
- Playwright smoke test and GitHub Actions CI workflow.
- Eleven unit tests and a 30-iteration benchmark test.
- Initial ADR, threat model, QA plan, and README.

## Next

1. Add persistent storage, auth, rate limiting, and public URL for verification records.
2. Expand Playwright to tamper, wrong-key, QR-image, and camera-permission scenarios.
3. Integrate hybrid/multi-signer modes into the UI and measure QR capacity.
4. Evaluate PAdES/CMS and blockchain testnet credentials as separate deployment spikes.
