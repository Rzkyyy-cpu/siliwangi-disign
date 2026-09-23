# ADR-001: Web Crypto dan Detached Signature

## Status
Accepted for MVP.

## Decision
Siliwangi DiSign menandatangani byte asli PDF dengan SHA-256 lalu ECDSA P-256 melalui Web Crypto API. Hasilnya adalah envelope JSON versioned yang dapat diunduh sebagai `.sig.json` dan dibawa oleh QR.

## Rationale
Web Crypto tersedia di browser modern, tidak membutuhkan private key dikirim ke backend, dan mudah didemokan dengan tamper test. Embedded PAdES/CMS ditunda karena membutuhkan byte-range dan library PDF signature khusus.

## Consequences
Perubahan satu byte PDF membuat hash berbeda dan signature ditolak. Signature bukan embedded dalam PDF sehingga verifier membutuhkan PDF asli dan envelope/QR.
