// 萬鷺朝鳳生態解說手冊：由 handbook.html 產生 handbook.pdf 與 content.md
//
//   node docs/egret-handbook/build.mjs
//
// handbook.html 是唯一的原稿。content.md（純文字稿）與 handbook.pdf（印刷檔）都從它產生，
// 不要手改那兩個檔——改了下次重跑就會被蓋掉，而且會跟印出來的版本對不上。
//
// 需要本機的 Edge 或 Chrome（用 headless 模式排版、輸出 PDF）。找不到時可設環境變數 BROWSER 指定路徑。
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const SRC = join(DIR, "handbook.html");

const candidates = [
  process.env.BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const BROWSER = candidates.find((p) => existsSync(p));
if (!BROWSER) {
  console.error("找不到 Edge 或 Chrome，請用環境變數 BROWSER 指定瀏覽器執行檔路徑");
  process.exit(1);
}

function run(args, opts = {}) {
  try {
    return execFileSync(BROWSER, ["--headless=new", "--disable-gpu", "--virtual-time-budget=8000", ...args], {
      encoding: "utf8", maxBuffer: 50e6, stdio: ["ignore", "pipe", "pipe"], ...opts,
    });
  } catch (e) {
    // Chromium 的 headless 常在成功輸出後仍回非零，有產物就算數
    return e.stdout ?? "";
  }
}

// ── 1. PDF ─────────────────────────────────────────────
const pdf = join(DIR, "handbook.pdf");
run(["--no-pdf-header-footer", "--run-all-compositor-stages-before-draw", `--print-to-pdf=${pdf}`, pathToFileURL(SRC).href]);
const pdfText = readFileSync(pdf).toString("latin1");
const pages = (pdfText.match(/\/Type\s*\/Page[^s]/g) || []).length;
const box = pdfText.match(/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/);
console.log(`handbook.pdf：${pages} 頁，${box ? `${(box[1] / 72 * 25.4).toFixed(0)}×${(box[2] / 72 * 25.4).toFixed(0)}mm` : "尺寸不明"}`);
if (pages % 4 !== 0) console.warn(`⚠ 頁數 ${pages} 不是 4 的倍數，騎馬釘會多出空白頁`);

// ── 2. 溢出檢查＋純文字稿（在瀏覽器裡從排好的版面抽出來）─────────
const extractor = `<script>
window.addEventListener("load", () => setTimeout(() => {
  const clean = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll("sup.ref").forEach((s) => s.replaceWith("［" + s.textContent + "］"));
    c.querySelectorAll("br").forEach((b) => b.replaceWith(""));
    return c.textContent.replace(/\\s+/g, " ").trim();
  };
  const out = [];
  const walk = (el) => {
    for (const n of el.children) {
      const cls = n.classList;
      if (cls.contains("folio")) continue;
      if (cls.contains("eyebrow")) { out.push("<!-- " + clean(n) + " -->"); continue; }
      if (n.tagName === "H1") { out.push("# " + clean(n)); continue; }
      if (n.tagName === "H2") { out.push("## " + clean(n)); continue; }
      if (n.tagName === "H3") { out.push("### " + clean(n)); continue; }
      if (n.tagName === "P") { out.push(clean(n)); continue; }
      if (cls.contains("subtitle") || cls.contains("en")) { out.push(clean(n)); continue; }
      if (n.tagName === "UL" || n.tagName === "OL") {
        out.push([...n.children].map((li, i) => (n.tagName === "OL" ? (i + 1) + ". " : "- ") + clean(li)).join("\\n")); continue;
      }
      if (n.tagName === "DL") {
        const dts = [...n.querySelectorAll("dt")];
        out.push(dts.map((dt) => "- **" + clean(dt) + "**：" + clean(dt.nextElementSibling)).join("\\n")); continue;
      }
      if (cls.contains("timeline")) {
        const ts = [...n.querySelectorAll(".t")];
        out.push(ts.map((t) => "- **" + clean(t) + "**　" + clean(t.nextElementSibling)).join("\\n")); continue;
      }
      if (cls.contains("route")) {
        out.push([...n.querySelectorAll(".stop")].map((s, i) => (i + 1) + ". **" + clean(s.querySelector(".name")) + "**" + (s.querySelector(".sub") ? "——" + clean(s.querySelector(".sub")) : "")).join("\\n")); continue;
      }
      if (cls.contains("five")) {
        out.push([...n.children].map((d) => "- **" + clean(d.querySelector("span")) + "**：" + clean(d.querySelector("small"))).join("\\n")); continue;
      }
      if (cls.contains("chain")) { out.push([...n.querySelectorAll("span")].map(clean).join(" → ")); continue; }
      if (cls.contains("year")) { out.push("〔月份條〕" + n.getAttribute("aria-label")); continue; }
      if (cls.contains("log")) {
        out.push([...n.querySelectorAll(".row")].map((r) => {
          const label = clean(r.querySelector(".l"));
          const choices = r.querySelector(".choices");
          const value = choices ? [...choices.children].map((c) => "○" + clean(c)).join("　") : clean(r).replace(label, "").trim();
          return "- " + label + "：" + (value || "＿＿＿＿");
        }).join("\\n")); continue;
      }
      if (cls.contains("sketch")) { out.push("〔空白框〕" + clean(n)); continue; }
      if (n.tagName === "FIGURE") {
        const media = n.querySelector("img, svg[aria-label]");
        const alt = media ? (media.getAttribute("alt") || media.getAttribute("aria-label")) : "";
        const cap = n.querySelector("figcaption");
        out.push("> 〔圖〕" + alt + (cap ? "\\n> " + clean(cap) : "")); continue;
      }
      if (n.tagName === "svg" || cls.contains("spacer") || cls.contains("rule")) continue;
      // 只含行內元素的區塊（封面頁尾、封底聯絡資訊這類）直接當一段文字
      const inlineOnly = [...n.children].every((c) => ["B", "I", "SPAN", "SUP", "SMALL", "A", "BR"].includes(c.tagName));
      if (inlineOnly) { const t = clean(n); if (t) out.push(t); continue; }
      walk(n);
    }
  };
  const mm = (px) => px * 25.4 / 96;
  const overflow = [];
  document.querySelectorAll("section.page").forEach((p, i) => {
    out.push("\\n---\\n\\n<!-- 第 " + (i + 1) + " 頁 -->");
    walk(p);
    const top = p.getBoundingClientRect().top, limit = p.clientHeight - parseFloat(getComputedStyle(p).paddingBottom);
    let bottom = 0;
    p.querySelectorAll("*").forEach((c) => { if (c.closest(".folio")) return; const r = c.getBoundingClientRect(); if (r.height) bottom = Math.max(bottom, r.bottom - top); });
    if (mm(bottom - limit) > 0.2) overflow.push({ page: i + 1, overMm: +mm(bottom - limit).toFixed(1) });
  });
  const pre = document.createElement("pre");
  pre.id = "__export";
  pre.textContent = JSON.stringify({ md: out.join("\\n\\n"), overflow });
  document.body.appendChild(pre);
}, 300));
</script>`;

const tmp = mkdtempSync(join(tmpdir(), "egret-handbook-"));
try {
  const html = readFileSync(SRC, "utf8")
    .replace("<head>", `<head><base href="${pathToFileURL(DIR).href}/">`)
    .replace("</body>", `${extractor}</body>`);
  const probe = join(tmp, "probe.html");
  writeFileSync(probe, html);
  const dom = run(["--dump-dom", pathToFileURL(probe).href]);
  const m = dom.match(/<pre id="__export">([\s\S]*?)<\/pre>/);
  if (!m) { console.error("抽不出文字稿（瀏覽器沒有回傳 DOM）"); process.exit(1); }
  const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  const { md, overflow } = JSON.parse(decode(m[1]));

  const header = `# 萬鷺朝鳳生態解說手冊・文字稿

> **這個檔是從 \`handbook.html\` 自動產生的，不要手改**——要改內容請改 \`handbook.html\`，再跑 \`node docs/egret-handbook/build.mjs\`。
> 方括號裡的數字〔例：［7］〕是出處編號，對應第 16 頁的出處清單。每一句的依據與「刻意不寫的事」見 \`README.md\`。
`;
  writeFileSync(join(DIR, "content.md"), header + md.replace(/\n{3,}/g, "\n\n") + "\n");
  console.log("content.md：已從版面抽出文字稿");
  if (overflow.length) {
    console.error("⚠ 有頁面內容超出版心（會被裁掉）：", JSON.stringify(overflow));
    process.exitCode = 1;
  } else {
    console.log(`版面檢查：${pages} 頁都沒有內容超出版心`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
