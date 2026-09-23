# Siliwangi DiSign - Project Plan and Status

Dokumen ini adalah rencana kerja utama proyek Siliwangi DiSign. Isinya membedakan bagian yang sudah diimplementasikan, bagian yang baru tersedia sebagai modul atau test, dan bagian yang belum dikerjakan.

## 1. Identitas Proyek

- Nama aplikasi: Siliwangi DiSign
- Jenis: Website digital signature dan verifikasi dokumen
- Stack: Next.js, React, TypeScript
- Crypto runtime: Web Crypto API
- Target utama: Website desktop/mobile browser
- Model: Local-first untuk private key dan proses signing
- Status umum: MVP ECDSA sedang dikembangkan
- Folder proyek: `siliwangi-disign/`

## 2. Tujuan Aplikasi

Aplikasi digunakan untuk:

1. Memilih dokumen PDF.
2. Menghitung hash SHA-256 dokumen.
3. Menandatangani hash dengan ECDSA P-256.
4. Menyertakan metadata penandatangan.
5. Membuat QR-Code berisi payload verifikasi.
6. Menghasilkan file signature JSON terpisah.
7. Memverifikasi bahwa dokumen belum diubah dan signature berasal dari public key yang sesuai.
8. Menolak dokumen, signature, public key, atau QR-Code yang tidak cocok.

## 3. Jalur Demo Utama

Jalur demo yang direncanakan untuk UTS:

```text
Pilih PDF
  -> Isi nama, jabatan, institusi
  -> Masukkan password vault
  -> Generate key ECDSA P-256
  -> Hitung SHA-256 PDF
  -> Tanda tangani hash
  -> Buat QR-Code
  -> Download PDF dan .sig.json
  -> Verifikasi dokumen asli: berhasil
  -> Ubah satu karakter atau satu byte PDF
  -> Verifikasi ulang: gagal
  -> Uji dengan public key yang salah: gagal
```

## 4. Arsitektur

```text
UI Next.js
  |
  +-- Document input
  +-- Signer metadata form
  +-- Signature import/export
  +-- QR presentation
  +-- Verification result
  |
Crypto and domain modules
  |
  +-- SHA-256
  +-- ECDSA P-256
  +-- Signature envelope
  +-- Encrypted key vault
  +-- Benchmark
  |
Browser storage
  |
  +-- Encrypted private-key vault only
  +-- No plaintext private key
  +-- No private key sent to backend
```

### Struktur source

| Path | Tanggung jawab | Status |
| --- | --- | --- |
| `src/app/page.tsx` | Menu Generate Key, Sign, Verify, Multi-Signer, Pengujian | Berjalan |
| `src/app/page.module.css` | UI styling responsive | Berjalan |
| `src/lib/crypto/ecdsa.ts` | Generate key, sign, verify, hash, import/export key | Berjalan |
| `src/lib/crypto/encoding.ts` | Base64URL dan hex encoding | Berjalan |
| `src/lib/signatures/envelope.ts` | Format `.sig.json`, parse, verify envelope | Berjalan |
| `src/lib/vault/encrypted-key-vault.ts` | PBKDF2 dan AES-GCM encrypted vault | Berjalan, termasuk unlock/reuse |
| `src/lib/vault/key-rotation.ts` | Rotasi key dan fingerprint | Berjalan |
| `src/lib/vault/vault-store.ts` | IndexedDB encrypted vault storage dan migrasi legacy | Berjalan |
| `src/lib/benchmark/signature-benchmark.ts` | Benchmark key generation, sign, verify | Berjalan sebagai modul |
| `src/lib/crypto/ml-dsa.ts` | ML-DSA-44 adapter nyata | Berjalan sebagai enrichment |
| `src/lib/signatures/multi-signer.ts` | Envelope dua atau lebih signer | Berjalan sebagai modul |
| `src/app/api/verify/route.ts` | Publish/get/verify record publik | Prototype berjalan, belum persistent |
| `src/types/jsqr.d.ts` | Type declaration untuk QR decoder | Berjalan |
| `tests/crypto-security.test.ts` | Test crypto dan vault | Berjalan |
| `tests/benchmark.test.ts` | Test minimal 30 iterasi | Berjalan |
| `.assist/` | ADR, threat model, QA, status, orchestration | Fondasi tersedia |

## 5. Requirement Wajib dan Status

### 5.1 Pembangkitan pasangan kunci

**Requirement:**

Gunakan RSA 2048 PSS, ECDSA P-256, atau Ed25519.

**Status:**

- Sudah diimplementasikan dengan ECDSA P-256.
- Menggunakan `crypto.subtle.generateKey`.
- Public key diekspor dalam format SPKI.
- Private key diekspor untuk dienkripsi dalam vault.
- RSA dan Ed25519 belum diimplementasikan.

### 5.2 Tanda tangan hash SHA-256

**Requirement:**

Signature harus diterapkan atas nilai hash SHA-256 dari PDF atau berkas lain.

**Status:**

- Sudah diimplementasikan.
- File dibaca sebagai byte asli.
- SHA-256 dihitung melalui Web Crypto API.
- Hash tersebut ditandatangani menggunakan ECDSA P-256.
- MVP UI membatasi pilihan file pada PDF.
- Dukungan UI untuk tipe file umum belum tersedia.

### 5.3 Verifikasi dokumen

**Requirement:**

Verifikasi harus menolak dokumen yang diubah dan signature dengan key yang tidak cocok.

**Status:**

Sudah diimplementasikan pada modul dan test:

- Hash PDF dihitung ulang.
- Perubahan ukuran dokumen ditolak.
- Perubahan satu byte ditolak.
- Signature yang diubah ditolak.
- Public key yang salah ditolak.
- Public key dan signature diverifikasi menggunakan Web Crypto API.
- UI dapat memverifikasi dokumen pada sesi yang sama.
- UI dapat memuat `.sig.json` untuk verifikasi lintas sesi.

### 5.4 QR-Code

**Requirement:**

QR-Code harus berisi metadata nama, jabatan, tanggal, institusi, serta signature atau tautan verifikasi.

**Status:**

Sudah sebagian besar diimplementasikan:

- QR-Code dibuat menggunakan package `qrcode`.
- Payload QR berisi signature envelope JSON.
- Envelope berisi nama, jabatan, tanggal, institusi, hash, public key, dan signature.
- QR-Code ditampilkan pada UI.
- QR-Code dapat didecode dari file gambar menggunakan `jsqr`.
- Payload hasil decode divalidasi sebagai signature envelope.
- Tautan verifikasi publik belum tersedia.

### 5.5 Private key terenkripsi

**Requirement:**

Private key harus disimpan terenkripsi dan tidak boleh ditulis langsung di source code.

**Status:**

Modul encrypted vault sudah tersedia dan diuji:

- Private key PKCS#8 dienkripsi dengan AES-256-GCM.
- Kunci AES diturunkan memakai PBKDF2-SHA-256.
- Salt acak dibuat dengan Web Crypto API.
- IV acak dibuat dengan Web Crypto API.
- Password minimal 8 karakter.
- Record vault menyimpan ciphertext, salt, IV, iteration count, public key, dan fingerprint.
- Vault disimpan pada IndexedDB sebagai ciphertext.
- Data vault lama di `localStorage` dimigrasikan otomatis ke IndexedDB.
- Password vault tidak pernah disimpan di database.
- Password dan private key tidak ditulis ke source code.
- Signing UI sudah membuat dan menyimpan vault.
- Flow unlock/reuse key tersedia jika vault ditemukan di `localStorage`.
- Rotasi key tersedia melalui helper dan kontrol UI.

## 6. Pengujian Wajib dan Status

### 6.1 Benchmark minimal 30 percobaan

**Status:** Sudah tersedia sebagai harness dan test.

Modul benchmark mengukur:

- Key generation.
- Signing.
- Verification.
- Average.
- Median.
- Minimum.
- Maximum.
- P95.
- Ukuran signature.
- Ukuran public key.

Test dan UI berjalan dengan 30 iterasi. UI dapat mengunduh laporan benchmark JSON untuk lampiran tugas.

### 6.2 Ukuran signature dan public key

**Status:** Sudah tersedia dalam hasil benchmark.

- Ukuran signature dihitung dalam byte.
- Ukuran public key dihitung dalam byte.
- Kontrol benchmark tersedia pada UI.
- Laporan belum otomatis dikomit ke `.assist/qa/report/`; hasil bergantung pada browser/perangkat pengujian.

### 6.3 Uji tamper

**Status:** Sudah diimplementasikan dan lulus.

- Fixture dokumen diubah satu byte.
- Hash hasil perubahan tidak cocok.
- Verifikasi menghasilkan status invalid.

### 6.4 Uji kunci salah

**Status:** Sudah diimplementasikan dan lulus.

- Signature dibuat dengan key pertama.
- Public key diganti dengan key kedua.
- Verifikasi ditolak.

### 6.5 Uji QR-Code palsu

**Status:** Import gambar dan scanning kamera browser tersedia; test kamera fisik masih diperlukan.

Sudah diuji secara tidak langsung melalui envelope:

- Hash berbeda.
- Signature berbeda.
- Public key salah.
- Format envelope invalid.

Belum tersedia:

- Test QR malformed melalui kamera pada perangkat nyata.
- Test QR dengan payload terpotong.

## 7. Fitur yang Sudah Berjalan di UI

- Navigasi menu terpisah: Generate Key, Sign Dokumen, Verify, Multi-Signer, dan Pengujian.
- Halaman workspace Siliwangi DiSign.
- Upload PDF.
- Form nama penandatangan.
- Form jabatan.
- Form institusi.
- Form password vault.
- Generate key ECDSA P-256.
- Generate hash dan signature.
- Generate QR-Code.
- Generate salinan PDF baru dengan QR tertanam pada halaman pertama.
- Menampilkan fingerprint public key.
- Download `.sig.json`.
- Import `.sig.json`.
- Import QR dari gambar.
- Scan QR dengan kamera browser.
- Rotasi key.
- Multi-signer envelope.
- ML-DSA-44 adapter.
- UI hybrid ECDSA + ML-DSA dan UI multi-signer.
- API verification prototype.
- Verifikasi PDF dan signature.
- Unlock/reuse encrypted vault setelah reload.
- Benchmark 30 iterasi dan download laporan JSON.
- Menampilkan pesan valid atau ditolak.
- Responsive layout untuk layar kecil.

## 8. Fitur yang Baru Tersedia sebagai Modul

Fitur berikut sudah ada di source code tetapi belum menjadi workflow lengkap:

- Encrypted private-key vault dan unlock/reuse.
- Benchmark signature.
- QR image decoder.
- Statistik median, p95, min, max, dan average.
- Import public key dari envelope.
- Export/import PKCS#8.
- Parser runtime envelope.

## 9. Fitur yang Belum Diimplementasikan

### Prioritas tinggi

1. Persistent database untuk API verification record.
2. Test kamera dan QR palsu pada perangkat nyata.
3. Input public key eksternal untuk workflow wrong-key di UI.
4. Validasi ukuran maksimum file dan payload.
5. Validasi MIME dan struktur PDF yang lebih ketat.

### Backend dan deployment

1. Persistent database untuk verification record.
2. Autentikasi dan rate limiting.
3. Public verification URL production.
4. HTTPS production.
5. Content Security Policy dan security headers.
6. Deployment production.

### Fitur pengayaan

1. Benchmark hybrid per algoritma.
2. QR payload hybrid dengan pengukuran kapasitas.
3. Signature tertanam ke PDF melalui PAdES/CMS.
4. Hash timestamp pada blockchain testnet.

## 10. Status ML-DSA

ML-DSA-44 sudah diimplementasikan sebagai adapter nyata menggunakan `@noble/post-quantum` dan diuji sign/verify serta tamper. Hybrid envelope dan QR hybrid belum dihubungkan ke UI karena ukuran payload perlu diuji terlebih dahulu.

Rencana implementasi:

1. Hubungkan adapter ML-DSA dengan hybrid envelope.
2. Ukur ukuran public key 1312 byte dan signature 2420 byte.
3. Ukur apakah payload hybrid masih muat dalam QR.
4. Pertahankan ECDSA sebagai jalur kompatibilitas utama.

## 11. Status Backend

Prototype backend sudah tersedia di `/api/verify` untuk publish, get, dan verify record. Penyimpanan saat ini in-memory sehingga belum cocok untuk production.

Keputusan arsitektur sementara:

- Private key tetap berada di browser.
- Backend tidak menerima private key.
- Backend hanya boleh menyimpan data publik:
  - document hash
  - public key atau fingerprint
  - signature
  - metadata publik
  - timestamp
  - verification record ID
- PDF tidak disimpan backend secara default.
- QR PDF adalah salinan visual setelah signing; signature envelope tetap mengikat byte PDF asli agar tidak terjadi circular signing.
- Persistent database, autentikasi, rate limit, dan public verification URL production belum selesai.

## 12. Struktur `.assist`

Sudah tersedia:

- `.assist/README.md`
- `.assist/status.md`
- `.assist/orchestration.md`
- `.assist/software-architect/adr/ADR-001-web-crypto-and-detached-signature.md`
- `.assist/cyber-security/report/threat-model-mvp.md`
- `.assist/qa/test-plans/TP-001-mvp.md`

Rencana tambahan:

- Feature specification dengan ID requirement.
- Risk register.
- Security dependency review.
- Benchmark evidence report.
- E2E execution log.
- Production readiness review.
- Release checklist.

## 13. Validasi yang Sudah Lulus

Perintah berikut sudah berhasil dijalankan:

```powershell
npm test
npm run lint
npm exec -- tsc --noEmit
npm run build
npm audit --omit=dev
```

Hasil terakhir:

- 5 test file lulus.
- 11 test lulus.
- TypeScript lulus.
- ESLint lulus.
- Production build lulus.
- Production dependency audit: 0 vulnerability.

## 14. Rencana Pengerjaan Berikutnya

### Tahap 1 - Key management lengkap

- Key unlock, reuse, rotasi, dan test-nya sudah selesai.

### Tahap 2 - QR verification lengkap

- QR decoder image upload dan camera scanner sudah tersedia.
- Parse QR menjadi envelope.
- Verifikasi PDF terhadap QR envelope.
- Tambahkan fake QR dan malformed QR test.

### Tahap 3 - Benchmark evidence

- Kontrol benchmark tersedia di UI.
- Jalankan 30 atau lebih iterasi.
- Tampilkan average, median, min, max, p95.
- Tampilkan ukuran signature dan public key.
- Export hasil benchmark ke JSON sudah tersedia; Markdown masih direncanakan.
- Simpan evidence pada `.assist/qa/report/`.

### Tahap 4 - E2E dan CI

- Playwright smoke test, fixture PDF, dan GitHub Actions sudah tersedia.
- E2E tamper/wrong-key/QR penuh masih perlu ditambah.
- Jalankan lint, typecheck, unit test, E2E, build, audit, dan secret scan.

### Tahap 5 - ML-DSA enrichment

- Provider spike dan adapter ML-DSA sudah selesai.
- Hybrid envelope sudah tersedia sebagai modul.
- Uji ukuran QR dan performa.

### Tahap 6 - Backend publik opsional

- Endpoint publish verification record sudah tersedia sebagai prototype.
- Pastikan endpoint menolak private key.
- Buat halaman verifikasi berdasarkan record ID.
- Tambahkan tautan publik ke QR.
- Tambahkan security headers dan HTTPS deployment.

## 15. Kriteria Selesai Proyek

Proyek dapat dianggap selesai untuk demo UTS jika:

- PDF dapat ditandatangani menggunakan ECDSA P-256.
- Hash SHA-256 tercatat dalam envelope.
- Metadata penandatangan masuk ke QR atau envelope.
- QR dapat dipindai atau diimport kembali.
- Verifikasi dokumen asli berhasil.
- Perubahan satu byte atau satu karakter menyebabkan verifikasi gagal.
- Public key yang salah menyebabkan verifikasi gagal.
- QR palsu menyebabkan verifikasi gagal.
- Private key tidak tersimpan plaintext.
- Minimal lima unit test crypto lulus.
- Benchmark minimal 30 iterasi tersedia.
- Ukuran signature dan public key tercatat.
- README memuat instalasi, penggunaan, anggota, dan NPM.
- Semua anggota dan NPM sudah diisi.

## 16. Catatan Keamanan

MVP belum boleh dianggap sebagai sistem tanda tangan digital tersertifikasi atau pengganti infrastruktur PKI resmi. Implementasi saat ini membuktikan integritas dokumen dan kepemilikan public key dalam konteks aplikasi. Untuk penggunaan produksi perlu ditambahkan manajemen identitas, trust anchor, key recovery policy, audit keamanan, deployment HTTPS, dan evaluasi standar signature dokumen seperti PAdES/CMS.
