"use client";

import QRCode from "qrcode";
import jsQR from "jsqr";
import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import { generateKeyPair } from "@/lib/crypto/ecdsa";
import { createEnvelope, parseEnvelope, SignatureEnvelope, verifyEnvelope } from "@/lib/signatures/envelope";
import { createEncryptedVault, unlockEncryptedVault } from "@/lib/vault/encrypted-key-vault";
import { benchmarkSignature, SignatureBenchmarkReport } from "@/lib/benchmark/signature-benchmark";
import { rotateKey } from "@/lib/vault/key-rotation";
import { readVault, writeVault } from "@/lib/vault/vault-store";
import { embedQrInPdf } from "@/lib/documents/pdf-qr";
import { generateMlDsa44KeyPair } from "@/lib/crypto/ml-dsa";
import { createHybridEnvelope, HybridSignatureEnvelope } from "@/lib/signatures/hybrid-envelope";
import { createMultiSignerEnvelope, MultiSignerEnvelope } from "@/lib/signatures/multi-signer";

type Menu = "home" | "generate" | "sign" | "verify" | "multi" | "testing";

export default function Home() {
  const [activeMenu, setActiveMenu] = useState<Menu>("home");
  const [file, setFile] = useState<File | null>(null);
  const [envelope, setEnvelope] = useState<SignatureEnvelope | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Belum ada dokumen yang dipilih.");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [institution, setInstitution] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
  const [vaultExists, setVaultExists] = useState(false);
  const [benchmarkReport, setBenchmarkReport] = useState<SignatureBenchmarkReport | null>(null);
  const [hybridEnvelope, setHybridEnvelope] = useState<HybridSignatureEnvelope | null>(null);
  const [multiEnvelope, setMultiEnvelope] = useState<MultiSignerEnvelope | null>(null);
  const [secondSignerName, setSecondSignerName] = useState("");
  const [secondSignerRole, setSecondSignerRole] = useState("");
  const [secondSignerInstitution, setSecondSignerInstitution] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    void readVault().then((vault) => setVaultExists(vault !== null)).catch(() => setVaultExists(false));
  }, []);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setEnvelope(null);
    setQrDataUrl(null);
    setStatus(selected ? `${selected.name} siap ditandatangani.` : "Belum ada dokumen yang dipilih.");
  }

  async function handleSign() {
    if (!file || !name || !role || !institution || password.length < 8) {
      setStatus("Lengkapi metadata dan gunakan password vault minimal 8 karakter.");
      return;
    }
    setIsBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let activeKeyPair = keyPair;
      const storedVault = await readVault();
      if (!activeKeyPair && storedVault) {
        activeKeyPair = await unlockEncryptedVault(storedVault, password);
        setKeyPair(activeKeyPair);
      }
      if (!activeKeyPair) {
        activeKeyPair = await generateKeyPair();
        const vault = await createEncryptedVault(activeKeyPair, password);
        await writeVault(vault);
        setVaultExists(true);
        setKeyPair(activeKeyPair);
      }
      const signature = await createEnvelope(file, bytes, activeKeyPair.privateKey, activeKeyPair.publicKey, {
        name, role, institution, signedAt: new Date().toISOString(),
      });
      setEnvelope(signature);
      setQrDataUrl(await QRCode.toDataURL(JSON.stringify(signature), { errorCorrectionLevel: "M", margin: 2, width: 280 }));
      setStatus("Dokumen berhasil ditandatangani dengan ECDSA P-256.");
    } catch {
      setStatus("Signing gagal. Password vault salah atau browser tidak mendukung Web Crypto.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleVerify() {
    if (!file || !envelope) {
      setStatus("Tandatangani dokumen atau muat signature JSON terlebih dahulu.");
      return;
    }
    setIsBusy(true);
    try {
      const result = await verifyEnvelope(envelope, new Uint8Array(await file.arrayBuffer()));
      setStatus(result.valid ? `VALID: ${result.reason}` : `DITOLAK: ${result.reason}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSignatureImport(event: ChangeEvent<HTMLInputElement>) {
    const signatureFile = event.target.files?.[0];
    if (!signatureFile) return;
    try {
      setEnvelope(parseEnvelope(await signatureFile.text()));
      setQrDataUrl(null);
      setStatus("Signature JSON berhasil dimuat. Pilih PDF asli untuk verifikasi.");
    } catch {
      setStatus("Signature JSON ditolak karena formatnya tidak valid.");
    }
  }

  async function handleQrImport(event: ChangeEvent<HTMLInputElement>) {
    const qrFile = event.target.files?.[0];
    if (!qrFile) return;
    setIsBusy(true);
    try {
      const image = new window.Image();
      const imageUrl = URL.createObjectURL(qrFile);
      image.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("QR image invalid"));
      });
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
      const previewUrl = canvas.toDataURL("image/png");
      URL.revokeObjectURL(imageUrl);
      if (!decoded) throw new Error("QR not found");
      setEnvelope(parseEnvelope(decoded.data));
      setQrDataUrl(previewUrl);
      setStatus("QR-Code berhasil dibaca. Pilih PDF asli untuk verifikasi.");
    } catch {
      setStatus("QR-Code tidak dapat dibaca atau payload-nya tidak valid.");
    } finally {
      setIsBusy(false);
    }
  }

  async function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  }

  async function handleCameraScan() {
    setIsBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("Arahkan kamera ke QR-Code.");
      const canvas = document.createElement("canvas");
      const scan = () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !cameraStreamRef.current) {
          if (cameraStreamRef.current) window.setTimeout(scan, 250);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
        if (decoded) {
          try {
            setEnvelope(parseEnvelope(decoded.data));
            setStatus("QR-Code kamera berhasil dibaca. Pilih PDF untuk verifikasi.");
            void stopCamera();
          } catch {
            setStatus("QR terbaca tetapi payload signature tidak valid.");
            void stopCamera();
          }
        } else {
          window.setTimeout(scan, 250);
        }
      };
      window.setTimeout(scan, 400);
    } catch {
      setStatus("Kamera tidak tersedia atau izin kamera ditolak.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRotateKey() {
    if (password.length < 8) {
      setStatus("Masukkan password vault minimal 8 karakter sebelum rotasi key.");
      return;
    }
    try {
      const stored = await readVault();
      const result = await rotateKey(stored, password);
      await writeVault(result.vault);
      setVaultExists(true);
      setKeyPair(null);
      setStatus(`Key dirotasi. Fingerprint baru: ${result.currentFingerprint}`);
    } catch {
      setStatus("Rotasi key gagal.");
    }
  }

  function downloadSignature() {
    if (!envelope) return;
    triggerDownload(
      new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" }),
      `${file?.name ?? "document"}.sig.json`,
    );
  }

  function downloadDocument() {
    if (!file) return;
    triggerDownload(file, file.name);
  }

  async function downloadSignedPdf() {
    if (!file || !qrDataUrl || !envelope) return;
    setIsBusy(true);
    try {
      const signedCopy = await embedQrInPdf(new Uint8Array(await file.arrayBuffer()), qrDataUrl, {
        name: envelope.signer.name,
        role: envelope.signer.role,
        signedAt: envelope.signer.signedAt,
      });
      const baseName = file.name.replace(/\.pdf$/i, "");
      const downloadBytes = new Uint8Array(signedCopy);
      triggerDownload(new Blob([downloadBytes.buffer], { type: "application/pdf" }), `${baseName}-signed.pdf`);
      setStatus("Salinan PDF dengan QR berhasil diunduh. Gunakan PDF asli + .sig.json untuk verifikasi hash.");
    } catch {
      setStatus("QR tidak dapat ditempelkan ke PDF.");
    } finally {
      setIsBusy(false);
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleBenchmark() {
    if (!file) {
      setStatus("Pilih PDF sebelum menjalankan benchmark.");
      return;
    }
    setIsBusy(true);
    try {
      const report = await benchmarkSignature(new Uint8Array(await file.arrayBuffer()), 30);
      setBenchmarkReport(report);
      setStatus("Benchmark 30 iterasi selesai.");
    } catch {
      setStatus("Benchmark gagal dijalankan di browser ini.");
    } finally {
      setIsBusy(false);
    }
  }

  function downloadBenchmark() {
    if (!benchmarkReport) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(benchmarkReport, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "siliwangi-disign-benchmark.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadJson(value: unknown, filename: string) {
    triggerDownload(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }), filename);
  }

  function downloadBenchmarkMarkdown() {
    if (!benchmarkReport) return;
    const report = `# Siliwangi DiSign Benchmark\n\n- Generated: ${benchmarkReport.generatedAt}\n- Iterations: ${benchmarkReport.iterations}\n- Signature size: ${benchmarkReport.signatureBytes} bytes\n- Public key size: ${benchmarkReport.publicKeyBytes} bytes\n\n| Operation | Average | Median | Min | Max | P95 |\n| --- | ---: | ---: | ---: | ---: | ---: |\n| Key generation | ${benchmarkReport.keyGeneration.averageMs.toFixed(3)} ms | ${benchmarkReport.keyGeneration.medianMs.toFixed(3)} ms | ${benchmarkReport.keyGeneration.minMs.toFixed(3)} ms | ${benchmarkReport.keyGeneration.maxMs.toFixed(3)} ms | ${benchmarkReport.keyGeneration.p95Ms.toFixed(3)} ms |\n| Signing | ${benchmarkReport.signing.averageMs.toFixed(3)} ms | ${benchmarkReport.signing.medianMs.toFixed(3)} ms | ${benchmarkReport.signing.minMs.toFixed(3)} ms | ${benchmarkReport.signing.maxMs.toFixed(3)} ms | ${benchmarkReport.signing.p95Ms.toFixed(3)} ms |\n| Verification | ${benchmarkReport.verification.averageMs.toFixed(3)} ms | ${benchmarkReport.verification.medianMs.toFixed(3)} ms | ${benchmarkReport.verification.minMs.toFixed(3)} ms | ${benchmarkReport.verification.maxMs.toFixed(3)} ms | ${benchmarkReport.verification.p95Ms.toFixed(3)} ms |\n`;
    triggerDownload(new Blob([report], { type: "text/markdown" }), "siliwangi-disign-benchmark.md");
  }

  async function handleHybridSign() {
    if (!file || !name || !role || !institution || password.length < 8) {
      setStatus("Pilih PDF, lengkapi identitas, dan isi password vault.");
      return;
    }
    setIsBusy(true);
    try {
      const activeKeys = keyPair ?? await generateKeyPair();
      if (!keyPair) setKeyPair(activeKeys);
      const mlDsa = generateMlDsa44KeyPair();
      const result = await createHybridEnvelope(file, new Uint8Array(await file.arrayBuffer()), activeKeys, mlDsa, { name, role, institution, signedAt: new Date().toISOString() });
      setHybridEnvelope(result);
      setStatus("Hybrid ECDSA + ML-DSA berhasil dibuat.");
    } catch {
      setStatus("Hybrid signing gagal.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMultiSign() {
    if (!file || !name || !role || !institution || !secondSignerName || !secondSignerRole || !secondSignerInstitution) {
      setStatus("Lengkapi dokumen dan metadata dua penandatangan.");
      return;
    }
    setIsBusy(true);
    try {
      const first = await generateKeyPair();
      const second = await generateKeyPair();
      const result = await createMultiSignerEnvelope(file, new Uint8Array(await file.arrayBuffer()), [
        { privateKey: first.privateKey, publicKey: first.publicKey, metadata: { name, role, institution, signedAt: new Date().toISOString() } },
        { privateKey: second.privateKey, publicKey: second.publicKey, metadata: { name: secondSignerName, role: secondSignerRole, institution: secondSignerInstitution, signedAt: new Date().toISOString() } },
      ]);
      setMultiEnvelope(result);
      setStatus("Dua penandatangan berhasil menandatangani dokumen.");
    } catch {
      setStatus("Multi-signer gagal.");
    } finally {
      setIsBusy(false);
    }
  }

  function menuLabel(menu: Menu): string {
    return { home: "Beranda", generate: "Generate Key", sign: "Sign Dokumen", verify: "Verify", multi: "Multi-Signer", testing: "Pengujian" }[menu];
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}><div className={styles.brand}><span className={styles.brandMark}>S</span><span>Siliwangi <b>DiSign</b></span></div><nav className={styles.nav}>{(["home", "generate", "sign", "verify", "multi", "testing"] as Menu[]).map((menu) => <button key={menu} className={activeMenu === menu ? styles.navActive : styles.navButton} onClick={() => setActiveMenu(menu)}>{menuLabel(menu)}</button>)}</nav><span className={styles.secureBadge}>● Local-first security</span></header>
      <main className={styles.main}>
        {activeMenu === "home" && <section className={styles.hero}><p className={styles.eyebrow}>DIGITAL SIGNATURE WORKSPACE</p><h1>Dokumen resmi,<br /><em>keaslian terbukti.</em></h1><p className={styles.lede}>Tandatangani PDF dengan ECDSA P-256 dan verifikasi integritasnya melalui QR-Code.</p><button className={styles.heroButton} onClick={() => setActiveMenu("sign")}>Mulai sign dokumen →</button></section>}
        {activeMenu === "generate" && <section className={styles.singlePanel}><div className={styles.panelHeading}><span className={styles.step}>KEY</span><div><h2>Generate key</h2><p>Kelola pasangan kunci ECDSA P-256 dan encrypted vault.</p></div></div><p className={styles.status}>Vault tersimpan di database browser: {vaultExists ? "ya" : "belum"}</p><button className={styles.primaryButton} onClick={handleRotateKey}>Rotasi key sekarang</button><p className={styles.note}>Password tidak disimpan. Database hanya menyimpan encrypted vault.</p></section>}
        {activeMenu === "sign" && <div className={styles.workspace}>
          <section className={styles.panel}>
            <div className={styles.panelHeading}><span className={styles.step}>01</span><div><h2>Dokumen</h2><p>Pilih berkas yang akan ditandatangani.</p></div></div>
            <label className={styles.dropzone}><span className={styles.uploadIcon}>↑</span><strong>{file ? file.name : "Pilih berkas PDF"}</strong><small>{file ? `${(file.size / 1024).toFixed(1)} KB` : "Maksimal 10 MB"}</small><input type="file" accept="application/pdf,.pdf" onChange={handleFile} /></label>
            <div className={styles.panelHeading}><span className={styles.step}>02</span><div><h2>Identitas</h2><p>Metadata ini ikut dilindungi signature.</p></div></div>
            <div className={styles.formGrid}><label>Nama penandatangan<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama lengkap" /></label><label>Jabatan<input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Contoh: Ketua Program Studi" /></label><label className={styles.full}>Institusi<input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Nama institusi" /></label><label className={styles.full}>Password vault<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" /></label></div>
            <button className={styles.primaryButton} disabled={isBusy} onClick={handleSign}>{isBusy ? "Memproses..." : "Tandatangani dokumen →"}</button><p className={styles.status}>{status}</p>
          </section>
          <section className={`${styles.panel} ${styles.previewPanel}`}>
            <div className={styles.panelHeading}><span className={styles.step}>03</span><div><h2>Bukti & verifikasi</h2><p>QR membawa payload verifikasi mandiri.</p></div></div>
            <div className={styles.qrFrame}>{qrDataUrl ? <Image src={qrDataUrl} alt="QR-Code signature" width={280} height={280} unoptimized /> : <div className={styles.qrPlaceholder}><span>⌁</span><small>QR-Code akan tampil<br />setelah signing</small></div>}</div>
            {envelope && <div className={styles.proof}><div><span>ALGORITMA</span><strong>ECDSA P-256 / SHA-256</strong></div><div><span>KEY FINGERPRINT</span><strong>{envelope.keyFingerprint}</strong></div></div>}
            <div className={styles.actions}><button className={styles.secondaryButton} disabled={!file} onClick={downloadDocument}>↓ Unduh PDF</button><button className={styles.verifyButton} disabled={!envelope || !file || isBusy} onClick={handleVerify}>✓ Verifikasi</button></div>
            <button className={styles.secondaryButton} disabled={!envelope || !qrDataUrl || isBusy} onClick={() => void downloadSignedPdf()}>↓ Unduh PDF + QR</button>
            <button className={styles.secondaryButton} disabled={!envelope} onClick={downloadSignature}>↓ Unduh signature .sig.json</button>
            <label className={styles.importButton}>Muat signature JSON<input type="file" accept="application/json,.json" onChange={handleSignatureImport} /></label>
            <label className={styles.importButton}>Baca QR dari gambar<input type="file" accept="image/*" onChange={handleQrImport} /></label>
            {!cameraOpen ? <button className={styles.importButton} disabled={isBusy} onClick={handleCameraScan}>Scan QR dengan kamera</button> : <button className={styles.importButton} onClick={() => void stopCamera()}>Tutup kamera</button>}
            {cameraOpen && <video ref={videoRef} className={styles.cameraPreview} autoPlay muted playsInline />}
            <button className={styles.importButton} disabled={isBusy} onClick={handleRotateKey}>Rotasi key</button>
            <button className={styles.importButton} disabled={!file || isBusy} onClick={handleBenchmark}>Jalankan benchmark 30 iterasi</button>
            {benchmarkReport && <button className={styles.importButton} onClick={downloadBenchmark}>Unduh laporan benchmark</button>}
            <p className={styles.note}>Private key disimpan sebagai ciphertext AES-GCM di browser dan tidak dikirim ke server.</p>
          </section>
        </div>}
        {activeMenu === "verify" && <section className={styles.singlePanel}><div className={styles.panelHeading}><span className={styles.step}>03</span><div><h2>Verify dokumen</h2><p>Masukkan PDF dan `.sig.json` atau QR-Code, lalu verifikasi integritasnya.</p></div></div><label className={styles.dropzone}><span className={styles.uploadIcon}>↑</span><strong>{file ? file.name : "Pilih PDF untuk diverifikasi"}</strong><small>PDF asli harus cocok dengan hash signature</small><input type="file" accept="application/pdf,.pdf" onChange={handleFile} /></label><label className={styles.importButton}>Muat signature JSON<input type="file" accept="application/json,.json" onChange={handleSignatureImport} /></label><label className={styles.importButton}>Baca QR dari gambar<input type="file" accept="image/*" onChange={handleQrImport} /></label>{cameraOpen && <video ref={videoRef} className={styles.cameraPreview} autoPlay muted playsInline />}<button className={styles.verifyButton} disabled={!file || !envelope || isBusy} onClick={handleVerify}>✓ Verifikasi sekarang</button><p className={styles.status}>{status}</p></section>}
        {activeMenu === "multi" && <section className={styles.singlePanel}><div className={styles.panelHeading}><span className={styles.step}>MULTI</span><div><h2>Multi-signer & hybrid</h2><p>Tanda tangani satu dokumen dengan dua signer atau ECDSA + ML-DSA.</p></div></div><label className={styles.dropzone}><span className={styles.uploadIcon}>↑</span><strong>{file ? file.name : "Pilih PDF"}</strong><input type="file" accept="application/pdf,.pdf" onChange={handleFile} /></label><div className={styles.formGrid}><label>Signer pertama<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama signer pertama" /></label><label>Jabatan<input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Jabatan" /></label><label>Institusi<input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Institusi" /></label><label>Signer kedua<input value={secondSignerName} onChange={(event) => setSecondSignerName(event.target.value)} placeholder="Nama signer kedua" /></label><label>Jabatan kedua<input value={secondSignerRole} onChange={(event) => setSecondSignerRole(event.target.value)} placeholder="Jabatan" /></label><label>Institusi kedua<input value={secondSignerInstitution} onChange={(event) => setSecondSignerInstitution(event.target.value)} placeholder="Institusi" /></label></div><div className={styles.actions}><button className={styles.primaryButton} disabled={isBusy} onClick={handleMultiSign}>Sign dengan 2 signer</button><button className={styles.verifyButton} disabled={isBusy} onClick={handleHybridSign}>Sign hybrid ML-DSA</button></div>{multiEnvelope && <button className={styles.secondaryButton} onClick={() => downloadJson(multiEnvelope, "multi-signer.sig.json")}>Unduh multi-signer JSON</button>}{hybridEnvelope && <button className={styles.secondaryButton} onClick={() => downloadJson(hybridEnvelope, "hybrid.sig.json")}>Unduh hybrid JSON</button>}<p className={styles.status}>{status}</p></section>}
        {activeMenu === "testing" && <section className={styles.singlePanel}><div className={styles.panelHeading}><span className={styles.step}>TEST</span><div><h2>Pengujian & benchmark</h2><p>Ukur signing, verification, ukuran key, dan signature minimal 30 iterasi.</p></div></div><button className={styles.primaryButton} disabled={!file || isBusy} onClick={handleBenchmark}>Jalankan benchmark 30 iterasi</button>{benchmarkReport && <><div className={styles.proof}><div><span>SIGNING AVG</span><strong>{benchmarkReport.signing.averageMs.toFixed(2)} ms</strong></div><div><span>VERIFY AVG</span><strong>{benchmarkReport.verification.averageMs.toFixed(2)} ms</strong></div><div><span>SIGNATURE</span><strong>{benchmarkReport.signatureBytes} bytes</strong></div><div><span>PUBLIC KEY</span><strong>{benchmarkReport.publicKeyBytes} bytes</strong></div></div><button className={styles.secondaryButton} onClick={downloadBenchmark}>Unduh laporan JSON</button><button className={styles.secondaryButton} onClick={downloadBenchmarkMarkdown}>Unduh laporan Markdown</button></>}<p className={styles.status}>{status}</p></section>}
        <div className={styles.footerNote}><span>SHA-256</span><span>ECDSA P-256</span><span>Offline verification ready</span></div>
      </main>
    </div>
  );
}
