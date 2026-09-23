declare module "jsqr" {
  type QRCode = {
    data: string;
    binaryData: number[];
    version: number;
    location: Record<string, { x: number; y: number }>;
  };

  type InversionAttempts = "dontInvert" | "onlyInvert" | "attemptBoth";

  type Options = {
    inversionAttempts?: InversionAttempts;
  };

  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: Options,
  ): QRCode | null;
}
