import { PDFDocument, rgb } from "pdf-lib";

export type QrPageMetadata = {
  name: string;
  role: string;
  signedAt: string;
};

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.split(",")[1];
  if (!encoded) throw new Error("QR data URL tidak valid.");
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function printable(value: string, maxLength = 72): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

export async function embedQrInPdf(
  pdfBytes: Uint8Array,
  qrDataUrl: string,
  metadata: QrPageMetadata,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes);
  const qrImage = await pdf.embedPng(dataUrlToBytes(qrDataUrl));
  const firstPage = pdf.getPages()[0];
  if (!firstPage) throw new Error("PDF tidak memiliki halaman.");
  const { width, height } = firstPage.getSize();
  const qrPage = pdf.addPage([width, height]);
  const qrSize = width * 0.8;
  const x = width * 0.1;
  const textHeight = 86;
  const topMargin = 24;
  const qrY = height - topMargin - qrSize;

  qrPage.drawRectangle({
    x: x - 8,
    y: qrY - 8,
    width: qrSize + 16,
    height: qrSize + 16,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.78, 0.75, 0.7),
    borderWidth: 1,
  });
  qrPage.drawImage(qrImage, { x, y: qrY, width: qrSize, height: qrSize });
  const textX = x;
  const textY = qrY - textHeight;
  const textColor = rgb(0.2, 0.25, 0.25);
  qrPage.drawText("Verifikasi Dokumen", { x: textX, y: textY + 58, size: 16, color: textColor });
  qrPage.drawText(`Nama: ${printable(metadata.name)}`, { x: textX, y: textY + 38, size: 11, color: textColor });
  qrPage.drawText(`Jabatan: ${printable(metadata.role)}`, { x: textX, y: textY + 22, size: 11, color: textColor });
  qrPage.drawText(`Waktu: ${printable(new Date(metadata.signedAt).toLocaleString("id-ID"))}`, { x: textX, y: textY + 6, size: 11, color: textColor });
  return pdf.save();
}
