/**
 * 對比度稽核器（瀏覽器端）
 *
 * 用途：實際量測頁面上每個文字節點的 WCAG 對比，找出不合格處。
 * 比對照原始碼 grep 可靠，因為它算的是「合成後的真實背景」——
 * 包含半透明卡片疊加、巢狀背景等 grep 看不出來的情況。
 *
 * 用法：
 *   1. 開 dev server，導到要檢查的頁面
 *   2. 把本檔內容整段貼進 DevTools Console
 *   3. 讀回傳的 { 不合格, 明細 }
 *
 * ⚠️ 已知限制：**絕對定位的覆蓋層抓不到**。
 *    像首頁 Hero 那種「照片 + 絕對定位的深色遮罩 + 文字」的結構，
 *    遮罩是文字的*兄弟節點*不是祖先，本工具往上找背景時會穿透到 body，
 *    於是把「米色字壓在深色遮罩上」誤判為「米色字壓在米白 body 上」。
 *    這類會出現在 `疊圖片_人工` 或以極低對比出現在明細中，需人工確認。
 *
 * 判準：內文 ≥4.5、大字（≥24px 或 ≥18.66px 粗體）與 UI 元件 ≥3.0（WCAG AA）
 */
(() => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  // 用 canvas 解析任意 CSS 色值——computed style 可能回傳 lab()/oklch()，regex 接不到
  const toRGB = c => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  };
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0').toUpperCase()).join('');
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

  const fail = [], onImage = [];
  for (const el of document.querySelectorAll('*')) {
    // 只看真正擁有文字節點的元素（避免把容器的 textContent 重複計算）
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) === 0) continue;

    // 往上收集所有背景層，遇到第一個不透明的就停
    let n = el, layers = [], hasImg = false;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none') { hasImg = true; break; }
      const b = toRGB(cs.backgroundColor);
      if (b && b.a > 0) layers.push(b);
      if (b && b.a >= 0.999) break;
      n = n.parentElement;
    }

    const rec = {
      文字: (el.textContent || '').trim().slice(0, 14),
      類別: (typeof el.className === 'string' ? el.className : '')
        .split(/\s+/).filter(c => /tea-/.test(c)).slice(0, 2).join(' '),
    };
    if (hasImg) { onImage.push(rec); continue; }

    // 由下往上做 alpha 合成，得到真正的視覺背景
    let acc = { r: 255, g: 255, b: 255 };
    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i];
      acc = { r: L.r * L.a + acc.r * (1 - L.a), g: L.g * L.a + acc.g * (1 - L.a), b: L.b * L.a + acc.b * (1 - L.a) };
    }

    const fg = toRGB(s.color);
    const px = parseFloat(s.fontSize), w = parseInt(s.fontWeight) || 400;
    const need = (px >= 24 || (px >= 18.66 && w >= 700)) ? 3 : 4.5;
    const r = ratio(fg, acc);
    if (r < need) fail.push({ ...rec, 對比: +r.toFixed(2), 需要: need, 前景: hex(fg), 底: hex(acc) });
  }

  return {
    頁面: location.pathname,
    不合格: fail.length,
    疊圖片_需人工: onImage.length,
    明細: fail,
  };
})()
