/**
 * pdf.js
 * 見積もり結果のPDF出力（jsPDF使用）
 * 依存: jsPDF CDN (@latest)
 * - 日本語フォント: NotoSansJP をCDNからランタイムで読み込み
 * - i18n対応: 現在の言語設定に応じてラベルを切り替え
 */

/** フォントキャッシュ */
let _fontLoaded = false;

/**
 * NotoSansJPフォントをCDNから読み込み、jsPDFに登録する
 * @param {jsPDF} doc
 */
async function loadJapaneseFont(doc) {
  if (_fontLoaded && doc.getFontList()["NotoSansJP"]) return true;

  try {
    // NotoSansJP Regular (subset) をCDNから取得
    const fontUrl = "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/SubsetOTF/JP/NotoSansJP-Regular.otf";
    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error(`Font fetch failed: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // ArrayBuffer を base64 に変換
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    doc.addFileToVFS("NotoSansJP-Regular.otf", base64);
    doc.addFont("NotoSansJP-Regular.otf", "NotoSansJP", "normal");
    _fontLoaded = true;
    return true;
  } catch (e) {
    console.warn("[pdf.js] 日本語フォントの読み込みに失敗しました。Helveticaで出力します:", e);
    return false;
  }
}

/**
 * PDF用ラベルテキストを返す（i18n対応）
 */
function pdfLabels() {
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";
  if (lang === "en") {
    return {
      title:       "Web Production Estimate",
      issueDate:   "Issue Date",
      note:        "* This is an approximate estimate from the simulator. A formal quote will be provided after a consultation.",
      totalLabel:  "Approximate Total (excl. tax)",
      timeline:    "Est. Timeline",
      days:        "days",
      breakdown:   "Cost Breakdown",
      totalRow:    "Total (approx., excl. tax)",
      footer:      "Aoki Design Studio  |  info@aoki-design-studio.com  |  https://aoki-design-studio.com",
      filename:    "Aoki-Design-Studio_Estimate",
      rushLabel:   "Rush surcharge",
    };
  }
  return {
    title:       "Web制作 お見積書",
    issueDate:   "発行日",
    note:        "※ 本書は見積シミュレーターによる概算です。正式お見積もりはヒアリング後にご提示いたします。",
    totalLabel:  "概算合計金額（税別）",
    timeline:    "推定納期",
    days:        "日",
    breakdown:   "費用内訳",
    totalRow:    "合計（概算・税別）",
    footer:      "Aoki Design Studio  |  info@aoki-design-studio.com  |  https://aoki-design-studio.com",
    filename:    "Aoki-Design-Studio_見積書",
    rushLabel:   "納期割増",
  };
}

/**
 * 見積もり結果をPDFとして出力する
 * @param {object} result       - calculatePrice()の戻り値
 * @param {object} selections   - simulatorState.selections
 */
async function generateEstimatePDF(result, selections) {
  if (typeof jspdf === "undefined" && typeof window.jsPDF === "undefined") {
    alert("PDF生成ライブラリの読み込みに失敗しました。ページを再読み込みしてください。");
    return;
  }

  const { jsPDF } = window.jspdf || window;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // 日本語フォントを読み込み
  const hasJPFont = await loadJapaneseFont(doc);

  const labels = pdfLabels();

  /** フォントを設定するヘルパー */
  function setFont(style = "normal") {
    if (hasJPFont) {
      doc.setFont("NotoSansJP", style === "bold" ? "normal" : "normal");
    } else {
      doc.setFont("helvetica", style);
    }
  }

  // ── フォント・色設定 ──────────────────────────────────
  const PAGE_W  = 210;
  const PAGE_H  = 297;
  const MARGIN  = 20;
  const CONTENT = PAGE_W - MARGIN * 2;

  const COLOR_DARK   = [44, 38, 34];
  const COLOR_ACCENT = [196, 105, 79];
  const COLOR_MUTED  = [158, 142, 131];
  const COLOR_BG     = [245, 237, 227];
  const COLOR_LINE   = [232, 221, 212];

  let y = 0;

  // ── ヘッダー（ブランドバー） ──────────────────────────
  doc.setFillColor(...COLOR_DARK);
  doc.rect(0, 0, PAGE_W, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  setFont("bold");
  doc.text("Aoki Design Studio", MARGIN, 16);

  doc.setFontSize(9);
  setFont("normal");
  doc.setTextColor(200, 200, 200);
  doc.text(labels.title, MARGIN, 23);

  // 発行日
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.setTextColor(180, 180, 180);
  doc.text(`${labels.issueDate}: ${today}`, PAGE_W - MARGIN, 23, { align: "right" });

  y = 40;

  // ── 注記 ──────────────────────────────────────────────
  doc.setFillColor(...COLOR_BG);
  doc.roundedRect(MARGIN, y, CONTENT, 10, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  setFont("normal");
  doc.text(labels.note, MARGIN + 4, y + 6.5);
  y += 18;

  // ── 合計金額 ──────────────────────────────────────────
  doc.setFillColor(...COLOR_DARK);
  doc.roundedRect(MARGIN, y, CONTENT, 28, 3, 3, "F");

  doc.setFontSize(10);
  setFont("normal");
  doc.setTextColor(180, 180, 180);
  doc.text(labels.totalLabel, MARGIN + 6, y + 9);

  doc.setFontSize(22);
  setFont("bold");
  doc.setTextColor(255, 255, 255);
  doc.text(
    "\xA5" + result.total.toLocaleString("ja-JP"),
    MARGIN + 6, y + 22
  );

  doc.setFontSize(10);
  setFont("normal");
  doc.setTextColor(180, 180, 180);
  doc.text(
    `${labels.timeline}: ${result.estimatedDays}${labels.days}`,
    PAGE_W - MARGIN - 6, y + 22,
    { align: "right" }
  );

  y += 38;

  // ── 費用内訳テーブル ──────────────────────────────────
  doc.setFontSize(12);
  setFont("bold");
  doc.setTextColor(...COLOR_DARK);
  doc.text(labels.breakdown, MARGIN, y);
  y += 6;

  doc.setDrawColor(...COLOR_LINE);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;

  const { siteType, pageCount, options, urgency } = selections;
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "ja";

  /** ラベルをi18n対応で取得 */
  function itemLabel(item) {
    return (lang === "en" && item.labelEn) ? item.labelEn : item.label;
  }

  const rows = [];
  if (siteType) {
    rows.push([itemLabel(siteType), `\xA5${siteType.basePrice.toLocaleString("ja-JP")}`]);
  }
  if (pageCount) {
    const base = result.breakdown?.base ?? 0;
    rows.push([
      `${lang === "en" ? "Pages" : "ページ数"}（${itemLabel(pageCount)} × ${pageCount.multiplier}）`,
      `\xA5${base.toLocaleString("ja-JP")}`,
    ]);
  }
  options.forEach((o) => {
    rows.push([itemLabel(o), `+\xA5${o.price.toLocaleString("ja-JP")}`]);
  });
  if (urgency && urgency.id !== "normal") {
    const surcharge = result.breakdown?.urgencySurcharge ?? 0;
    rows.push([`${labels.rushLabel}（${itemLabel(urgency)}）`, `+\xA5${surcharge.toLocaleString("ja-JP")}`]);
  }

  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(252, 249, 245);
      doc.rect(MARGIN, y - 3, CONTENT, 10, "F");
    }
    doc.setFontSize(9.5);
    setFont("normal");
    doc.setTextColor(...COLOR_DARK);
    doc.text(row[0], MARGIN + 4, y + 4);
    setFont("bold");
    doc.text(row[1], PAGE_W - MARGIN - 4, y + 4, { align: "right" });
    y += 10;
  });

  // 合計行
  doc.setFillColor(...COLOR_ACCENT);
  doc.rect(MARGIN, y, CONTENT, 12, "F");
  doc.setFontSize(10.5);
  setFont("bold");
  doc.setTextColor(255, 255, 255);
  doc.text(labels.totalRow, MARGIN + 4, y + 8);
  doc.text(`\xA5${result.total.toLocaleString("ja-JP")}`, PAGE_W - MARGIN - 4, y + 8, {
    align: "right",
  });
  y += 22;

  // ── フッター ──────────────────────────────────────────
  doc.setFillColor(...COLOR_DARK);
  doc.rect(0, PAGE_H - 20, PAGE_W, 20, "F");
  doc.setFontSize(8);
  setFont("normal");
  doc.setTextColor(180, 180, 180);
  doc.text(labels.footer, PAGE_W / 2, PAGE_H - 8, { align: "center" });

  // ── ダウンロード ──────────────────────────────────────
  const filename = `${labels.filename}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// ─── PDFボタン初期化 ──────────────────────────────────────
function initPdfButton() {
  const btn = document.getElementById("btnPdf");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (typeof simulatorState === "undefined") return;
    const result = calculatePrice();
    if (!result) return;

    // ローディング表示
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = typeof getCurrentLang === "function" && getCurrentLang() === "en"
      ? "Generating..." : "生成中...";

    await generateEstimatePDF(result, simulatorState.selections);

    btn.disabled = false;
    btn.textContent = originalText;

    // GA4トラッキング
    if (typeof trackPdfDownload === "function") {
      trackPdfDownload(result.total);
    }
  });
}

document.addEventListener("DOMContentLoaded", initPdfButton);
