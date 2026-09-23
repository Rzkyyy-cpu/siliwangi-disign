# Siliwangi DiSign

Website untuk menandatangani dokumen PDF secara digital dan memverifikasi keasliannya melalui SHA-256, ECDSA P-256, dan QR-Code.

## Status

MVP awal tersedia: pilih PDF, isi metadata penandatangan, buat signature ECDSA P-256, hasilkan QR payload, unduh `.sig.json`, dan verifikasi ulang dokumen.

Encrypted private-key vault, unlock/reuse, key rotation, QR image/camera decoding, ML-DSA-44 hybrid signing, multi-signer signing, API prototype, Playwright smoke test, and CI are implemented.

Menu utama website:

- `Generate Key`: membuat dan merotasi encrypted key vault.
- `Sign Dokumen`: signing PDF, metadata, QR, dan `.sig.json`.
- `Verify`: verifikasi PDF melalui `.sig.json`, QR gambar, atau kamera.
- `Multi-Signer`: signing dua penandatangan dan hybrid ML-DSA.
- `Pengujian`: benchmark 30 iterasi dan download laporan JSON/Markdown.

## Menjalankan

```powershell
npm install
npm run dev
```

Buka `http://localhost:3000`.

Validasi lokal:

```powershell
npm run lint
npm exec -- tsc --noEmit
npm run build
```

## Demo UTS

1. Pilih sebuah PDF.
2. Isi nama, jabatan, dan institusi.
3. Klik `Tandatangani dokumen`.
4. Simpan QR-Code dan file `.sig.json`.
5. Klik `Verifikasi` untuk hasil valid.
6. Ubah satu byte/karakter PDF, pilih berkas hasil perubahan, lalu verifikasi ulang. Hasil harus ditolak karena hash SHA-256 berbeda.
7. Uji signature dengan public key yang berbeda. Hasil harus ditolak.
8. Simpan QR sebagai gambar, muat kembali melalui kontrol `Baca QR dari gambar`, lalu verifikasi PDF.
9. Jalankan benchmark 30 iterasi dan unduh laporan JSON.
10. Klik `Unduh PDF + QR` untuk membuat salinan PDF baru dengan QR pada halaman pertama.

## Keamanan

- Hash dokumen menggunakan SHA-256.
- Signature MVP menggunakan ECDSA P-256.
- Randomness disediakan Web Crypto API.
- Backend prototype only stores verification records in memory; private key is never sent to the server.
- Encrypted vault disimpan di IndexedDB database browser; password tidak pernah disimpan.
- Modul vault memakai PBKDF2-SHA-256 dan AES-256-GCM dengan salt/IV acak.
- QR-Code adalah media payload; keaslian tetap ditentukan oleh pemeriksaan hash dan signature.
- QR dapat diimport dari gambar dan dipindai melalui kamera jika browser grants permission.
- Salinan PDF dengan QR dapat dibuat melalui `Unduh PDF + QR`; file ini adalah artefak visual dan hash verifikasi tetap merujuk PDF asli.
- ML-DSA-44 uses the real `@noble/post-quantum` provider, not a simulated signature.
- Jangan gunakan hasil MVP untuk dokumen produksi sebelum encrypted private-key vault, parser validation, test tamper, dan audit dependency selesai.

## Anggota

| Nama | NPM |
| Ghea Ragil Aulia | 247006111003 |
| Ristin Iman Andini| 247006111024 |
| Muhamad Rizky Pratama | 247006111046 |

## Struktur proses

Dokumentasi arsitektur, security, QA, dan status pengembangan ada di `.assist/`.
