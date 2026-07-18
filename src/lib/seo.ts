// 供各頁 metadata 產生 canonical + hreflang alternates（zh-TW 為預設、en 為 /en 前綴）
export function langAlternates(path: string) {
  const enPath = path === "/" ? "/en" : `/en${path}`;
  return {
    canonical: path,
    languages: {
      "zh-TW": path,
      en: enPath,
    },
  };
}

// JSON-LD 安全序列化：轉義 < 避免 </script> 突破標籤（見 docs/security-assessment-2026-07.md）
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
