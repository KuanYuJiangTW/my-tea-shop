/**
 * 攻略文內文的自動連結。
 *
 * 背景（2026-08-30）：`/tea-guide/cattle-egret-viewing-guide` 全文 33 段、
 * 手機版 5,968px 高，卻只有 **1 個連結**，位置在 80% 捲動深度的頁尾 CTA。
 * 最強的銷售段（「想聽解說的話」）白紙黑字寫「可以在網站上直接預約」，
 * 底下沒有任何可點的東西；電話 `0972-619-391` 出現 3 次，全是死文字——
 * 手機使用者看到電話的直覺就是點它，點不動就是體驗斷點。
 *
 * 文章正文存在 Sanity、型別是 `string[]`，塞不進 `<a>`。與其為了三個連結
 * 把內容模型換成 Portable Text（連帶要改 schema、Studio、JSON-LD 取文），
 * 不如在算繪層把「本來就是連結」的東西認出來。
 *
 * 只認兩種、故意不做更多：
 *   1. 台灣手機號碼 `09xx-xxx-xxx` → `tel:`（每次出現都連，讀者在哪一段想打都行）
 *   2. 該篇 `relatedExperiences` 的體驗名稱 → 體驗頁（**全文只連第一次**）
 *
 * 體驗名稱只連第一次，是因為這篇文章裡「萬鷺朝鳳・茶山導覽」出現兩次；
 * 兩次都連會讓內文看起來像置入行銷，而這篇的說服力正來自它不像廣告。
 */

/** 台灣手機號碼。刻意只認帶連字號的寫法：`08:00 到 22:00`、`8 月 22 日` 都不該被吃掉 */
const PHONE_PATTERN = /09\d{2}-\d{3}-\d{3}/g;

export interface LinkSpan {
  text: string;
  href: string;
}

/** 純文字，或一段要包成連結的文字 */
export type ParagraphSegment = string | LinkSpan;

export interface LinkableName {
  name: string;
  href: string;
}

/**
 * 把一段文字切成「純文字」與「連結」片段。
 *
 * @param text     段落原文
 * @param names    可連結的名稱（通常是 relatedExperiences）
 * @param linked   已經連過的名稱。**跨段落共用同一個 Set**，用來實作「全文只連第一次」；
 *                 命中的名稱會被寫進去。
 */
export function linkifyParagraph(
  text: string,
  names: LinkableName[],
  linked: Set<string>,
): ParagraphSegment[] {
  interface Candidate { start: number; end: number; href: string; claims?: string }

  const candidates: Candidate[] = [];

  // 用 exec 迴圈而不是 matchAll：matchAll 的迭代需要 lib ES2020，
  // 本專案 tsconfig 的 target 是 ES2017
  PHONE_PATTERN.lastIndex = 0;
  let hit: RegExpExecArray | null;
  while ((hit = PHONE_PATTERN.exec(text)) !== null) {
    candidates.push({
      start: hit.index,
      end:   hit.index + hit[0].length,
      // `tel:` 對連字號以外的格式很挑，去掉最保險
      href:  `tel:${hit[0].replace(/-/g, "")}`,
    });
  }

  for (const { name, href } of names) {
    if (!name || linked.has(name)) continue;
    const at = text.indexOf(name);
    if (at === -1) continue;
    candidates.push({ start: at, end: at + name.length, href, claims: name });
  }

  // 位置先後排序；同一個起點時長的優先，避免短的把長的切斷
  candidates.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: ParagraphSegment[] = [];
  let cursor = 0;

  for (const c of candidates) {
    if (c.start < cursor) continue;            // 與前一個重疊，讓先出現的贏
    if (c.start > cursor) segments.push(text.slice(cursor, c.start));
    segments.push({ text: text.slice(c.start, c.end), href: c.href });
    if (c.claims) linked.add(c.claims);        // 只在真的輸出時才記，被重疊擋掉的不算用掉
    cursor = c.end;
  }

  if (cursor < text.length) segments.push(text.slice(cursor));
  return segments;
}
