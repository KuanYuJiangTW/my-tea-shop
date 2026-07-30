// 以檔案實際內容（magic bytes）判斷圖片格式。
//
// 為什麼需要：上傳端點原本只信任 client 提供的 MIME 與副檔名，兩者都由客端
// 自行填寫。把任意檔案改名為 .png 並宣告 image/png 即可通過白名單，內容則
// 原封不動存進公開 bucket——等於在自己網域下托管任意檔案。
// 檔頭是內容本身的一部分，客端無法只靠改標頭偽造。

export type ImageKind = "jpeg" | "png" | "webp";

const MIME_BY_KIND: Record<ImageKind, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  return sig.every((b, i) => bytes[offset + i] === b);
}

/**
 * 從檔頭辨識圖片格式，無法辨識時回傳 null。
 * 只需要前 16 bytes，呼叫端不必把整份檔案讀進記憶體。
 */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";

  // WebP: "RIFF" ....（4 bytes 檔案大小）"WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "webp";
  }

  return null;
}

/** 該格式對應的正規 MIME，用於存檔時覆蓋客端宣告的值。 */
export function mimeForKind(kind: ImageKind): string {
  return MIME_BY_KIND[kind];
}

/** 該格式對應的正規副檔名。 */
export function extForKind(kind: ImageKind): string {
  return kind === "jpeg" ? "jpg" : kind;
}
