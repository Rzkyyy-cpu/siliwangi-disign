# Threat Model MVP

## Assets

- PDF bytes dan hash SHA-256.
- Signature dan public key.
- Metadata penandatangan.
- Private key sementara di browser.

## Threats

- PDF diubah satu byte.
- Signature, hash, public key, atau QR dipalsukan.
- Envelope malformed atau berukuran berlebihan.
- Private key masuk log, URL, network request, atau repository.
- Backend mengubah verification record.

## Controls

- Hash ulang PDF saat verification.
- Verifikasi ECDSA menggunakan public key di envelope.
- Validasi format/version/algorithm dan ukuran input.
- Private key tidak dikirim ke backend.
- Encrypted persistent vault wajib dibuat sebelum production.
- QR bukan trust anchor; signature adalah trust check.
