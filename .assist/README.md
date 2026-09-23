# Siliwangi DiSign Assist

`.assist` adalah sumber keputusan dan evidence proyek. Kode harus mengikuti ADR, threat model, feature spec, dan test plan yang tercatat di sini.

## Status awal

- Stack: Next.js + TypeScript.
- Crypto MVP: Web Crypto API, SHA-256, ECDSA P-256.
- Signature: detached `.sig.json` dan QR payload.
- Private-key vault terenkripsi: belum selesai, blocker sebelum produksi.
- ML-DSA: spike terpisah, belum boleh disimulasikan.

Setiap perubahan security-sensitive harus memperbarui ADR, test case, dan status.
