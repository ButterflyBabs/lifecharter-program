import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { loadPdfAssets, pdfSafe, renderCharterPdf } from "../lib/program/charter-pdf";
import { buildCharter } from "../lib/program/charter";
import { samplePdfInput } from "../lib/program/charter-sample";

describe("Charter PDF", () => {
  it("renders an in-progress and a signed Charter as valid multi-page PDFs", async () => {
    const assets = await loadPdfAssets();
    const out = process.env.CHARTER_PDF_OUT;
    if (out) mkdirSync(out, { recursive: true });
    for (const state of ["draft", "signed", "renewal"] as const) {
      const bytes = await renderCharterPdf(samplePdfInput(state), assets);
      expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
      const loaded = await PDFDocument.load(bytes);
      // cover + ratings/chapters + signing page
      expect(loaded.getPageCount()).toBeGreaterThanOrEqual(4);
      expect(loaded.getTitle()).toContain("Eloise");
      if (out) writeFileSync(path.join(out, `charter-${state}.pdf`), bytes);
    }
  });

  it("copes with an empty Charter and with unusual characters", async () => {
    const assets = await loadPdfAssets();
    const doc = buildCharter([{ week: 1, field: "truth", value: "Emoji 🦋 and Łukasz, café — “quotes” and 日本語.\n\nSecond paragraph." }]);
    const bytes = await renderCharterPdf({ name: "Zoë Łukasz 🦋", className: null, doc, signing: null }, assets);
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBeGreaterThanOrEqual(3);
    const empty = await renderCharterPdf({ name: "Nobody", className: null, doc: buildCharter([]), signing: null }, assets);
    expect(Buffer.from(empty.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("sanitizes text for the embedded fonts", async () => {
    const assets = await loadPdfAssets();
    const pdf = await PDFDocument.create();
    const { default: fontkit } = await import("@pdf-lib/fontkit");
    pdf.registerFontkit(fontkit);
    const font = await pdf.embedFont(assets.fonts.body, { subset: true });
    expect(pdfSafe(font, "Hello 🦋 world")).toBe("Hello  world");
    expect(pdfSafe(font, "café")).toBe("café");
    expect(pdfSafe(font, "日")).toBe("?");
  });
});
