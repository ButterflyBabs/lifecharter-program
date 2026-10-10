// Builds the printable LifeCharter PDF (US Letter) in the LifeCharter brand: ivory pages, EB Garamond
// headings, Lora reading text, Montserrat labels, lifted cards with a gold inner line.
// Uses pdf-lib (pure JavaScript, no browser or native parts, so it runs the same locally and on Vercel)
// with the brand fonts shipped in lib/program/charter-fonts.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { declaration, type CharterDoc } from "./charter";

// ---- What goes in -----------------------------------------------------------------------------

export type PdfSigning = {
  version: number;
  kind: "initial" | "renewal";
  signedName: string;
  commitment: string;
  witness: string | null;
  signedOn: string; // YYYY-MM-DD
  renewalDueOn: string; // YYYY-MM-DD
  renewalRatings?: Record<string, number> | null;
};

export type PdfInput = {
  /** The member's name as it appears on the cover */
  name: string;
  className: string | null;
  doc: CharterDoc;
  /** null = an in-progress Charter that has not been signed */
  signing: PdfSigning | null;
  /** Printed as a banner on every page, e.g. for the admin test-member preview */
  banner?: string;
  /** For the "in progress" date on unsigned Charters (YYYY-MM-DD) */
  asOf?: string;
};

export type PdfAssets = {
  fonts: Record<FontKey, Uint8Array>;
  logo: Uint8Array;
  emblem: Uint8Array;
};

type FontKey = "display" | "displayItalic" | "body" | "bodyItalic" | "bodyBold" | "ui" | "uiBold";

const FONT_FILES: Record<FontKey, string> = {
  display: "eb-garamond-latin-500-normal.woff",
  displayItalic: "eb-garamond-latin-500-italic.woff",
  body: "lora-latin-400-normal.woff",
  bodyItalic: "lora-latin-400-italic.woff",
  bodyBold: "lora-latin-600-normal.woff",
  ui: "montserrat-latin-600-normal.woff",
  uiBold: "montserrat-latin-700-normal.woff",
};

/** Reads the fonts and logos from disk (the PDF routes list these in outputFileTracingIncludes). */
export async function loadPdfAssets(root = process.cwd()): Promise<PdfAssets> {
  const dir = path.join(root, "lib/program/charter-fonts");
  const entries = await Promise.all(
    (Object.keys(FONT_FILES) as FontKey[]).map(async (k) => [k, new Uint8Array(await readFile(path.join(dir, FONT_FILES[k])))] as const),
  );
  const [logo, emblem] = await Promise.all([
    readFile(path.join(root, "public/brand/lifecharter-logo.png")),
    readFile(path.join(root, "public/brand/lifecharter-emblem.png")),
  ]);
  return { fonts: Object.fromEntries(entries) as Record<FontKey, Uint8Array>, logo: new Uint8Array(logo), emblem: new Uint8Array(emblem) };
}

// ---- Brand ------------------------------------------------------------------------------------

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = {
  ivory: hex("#FBF8F1"),
  paper: hex("#FFFDF8"),
  blushSoft: hex("#FCEFEA"),
  blush: hex("#F5D8CF"),
  ink: hex("#2E3A3F"),
  soft: hex("#5B6A6F"),
  line: hex("#EADFCF"),
  teal: hex("#0F5B63"),
  ocean: hex("#4EA7A1"),
  terra: hex("#8C4331"),
  terraSoft: hex("#C76F56"),
  gold: hex("#D4AF63"),
  apricot: hex("#F0B58B"),
  stone: hex("#C5C1B8"),
};

// ---- Page geometry (top-down measurements in points; US Letter) --------------------------------

const PW = 612;
const PH = 792;
const MX = 54; // side margin
const CW = PW - 2 * MX; // content width
const TOP = 58;
const BOTTOM = 62; // room left for the footer
const LIMIT = PH - BOTTOM;
const PAD = 20; // inside a card
const GAP = 16;

type Fonts = Record<FontKey, PDFFont>;
type Block = { h: number; keepNext?: boolean; draw: (page: PDFPage, x: number, top: number, w: number) => void };

// ---- Text helpers -----------------------------------------------------------------------------

/** Keeps only characters the font can draw: tidies accents and drops emoji and unsupported scripts. */
export function pdfSafe(font: PDFFont, input: string) {
  const have = new Set(font.getCharacterSet());
  let out = "";
  for (const ch of input.normalize("NFC")) {
    const cp = ch.codePointAt(0)!;
    if (ch === "\n") out += ch;
    else if (ch === "\t") out += " ";
    else if (cp < 32 || cp === 127) continue;
    else if (have.has(cp)) out += ch;
    else {
      const base = ch.normalize("NFD")[0];
      if (base && have.has(base.codePointAt(0)!)) out += base;
      else if (/[\p{Extended_Pictographic}‍️​-‏]/u.test(ch)) continue;
      else if (have.has(63)) out += "?";
    }
  }
  return out;
}

function wrap(font: PDFFont, size: number, width: number, raw: string): string[] {
  const text = pdfSafe(font, raw);
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const tryLine = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(tryLine, size) <= width) {
        line = tryLine;
        continue;
      }
      if (line) lines.push(line);
      // A single very long word: break it by characters.
      let piece = word;
      while (font.widthOfTextAtSize(piece, size) > width) {
        let n = piece.length;
        while (n > 1 && font.widthOfTextAtSize(piece.slice(0, n), size) > width) n--;
        lines.push(piece.slice(0, n));
        piece = piece.slice(n);
      }
      line = piece;
    }
    lines.push(line);
  }
  return lines;
}

const base = (top: number, lh: number, size: number) => PH - (top + lh / 2 + size * 0.35); // pdf y of a text baseline

function spacedWidth(font: PDFFont, size: number, text: string, spacing: number) {
  return font.widthOfTextAtSize(text, size) + spacing * Math.max(0, [...text].length - 1);
}

/** Draws small caps-style labels with letter spacing (pdf-lib has no tracking option). */
function drawSpaced(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>, spacing: number) {
  let cx = x;
  for (const ch of text) {
    page.drawText(ch, { x: cx, y, size, font, color });
    cx += font.widthOfTextAtSize(ch, size) + spacing;
  }
}

function drawCentered(page: PDFPage, text: string, centerX: number, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
  page.drawText(text, { x: centerX - font.widthOfTextAtSize(text, size) / 2, y, size, font, color });
}

function dateLong(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// ---- Shapes -----------------------------------------------------------------------------------

function roundedPath(w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M ${rr} 0 H ${w - rr} A ${rr} ${rr} 0 0 1 ${w} ${rr} V ${h - rr} A ${rr} ${rr} 0 0 1 ${w - rr} ${h} H ${rr} A ${rr} ${rr} 0 0 1 0 ${h - rr} V ${rr} A ${rr} ${rr} 0 0 1 ${rr} 0 Z`;
}

/** The lifted card: a soft layered shadow, the paper, a hairline edge, and the gold inner line. */
function card(page: PDFPage, x: number, top: number, w: number, h: number, opts: { fill?: ReturnType<typeof rgb>; gold?: boolean } = {}) {
  const r = 14;
  for (const s of [
    { g: 7, dy: 6, o: 0.014 },
    { g: 4.5, dy: 4.5, o: 0.02 },
    { g: 2.2, dy: 3, o: 0.028 },
    { g: 0.6, dy: 1.4, o: 0.04 },
  ]) {
    page.drawSvgPath(roundedPath(w + 2 * s.g, h + 2 * s.g, r + s.g), { x: x - s.g, y: PH - (top - s.g + s.dy), color: C.ink, opacity: s.o });
  }
  page.drawSvgPath(roundedPath(w, h, r), { x, y: PH - top, color: opts.fill ?? C.paper, borderColor: C.line, borderWidth: 0.6 });
  if (opts.gold !== false) {
    page.drawSvgPath(roundedPath(w - 12, h - 12, r - 5), { x: x + 6, y: PH - (top + 6), borderColor: C.gold, borderWidth: 0.7, borderOpacity: 0.9 });
  }
}

function backdrop(page: PDFPage) {
  page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: C.ivory });
  // Soft watercolor washes in the corners, as on the printable handouts. Stacked circles fade toward the edge.
  const wash = (x: number, y: number, r: number, color: ReturnType<typeof rgb>, strength: number) => {
    const steps = 22;
    for (let i = 0; i < steps; i++) {
      page.drawCircle({ x, y, size: r * (1 - i / steps), color, opacity: strength / steps });
    }
  };
  wash(0, PH, 280, C.ocean, 0.2);
  wash(PW, PH, 240, C.blush, 0.85);
  wash(PW, 0, 260, C.apricot, 0.3);
}

// ---- The document -----------------------------------------------------------------------------

export async function renderCharterPdf(input: PdfInput, assets: PdfAssets): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const f = Object.fromEntries(
    await Promise.all((Object.keys(FONT_FILES) as FontKey[]).map(async (k) => [k, await pdf.embedFont(assets.fonts[k], { subset: true })] as const)),
  ) as Fonts;
  const logo = await pdf.embedPng(assets.logo);
  const emblem = await pdf.embedPng(assets.emblem);

  const { doc, signing } = input;
  const title = `My LifeCharter: ${pdfSafe(f.display, input.name)}`;
  pdf.setTitle(title);
  pdf.setAuthor("The LifeCharter Program");
  pdf.setSubject(signing ? `Signed LifeCharter, version ${signing.version}` : "LifeCharter, in progress");
  pdf.setCreator("The LifeCharter Program");
  pdf.setProducer("The LifeCharter Program");

  const pages: PDFPage[] = [];
  const newPage = () => {
    const p = pdf.addPage([PW, PH]);
    backdrop(p);
    pages.push(p);
    return p;
  };

  // ---- Cover
  {
    const p = newPage();
    const lw = 230;
    p.drawImage(logo, { x: (PW - lw) / 2, y: PH - 62 - lw / 3, width: lw, height: lw / 3 });
    let t = 190;
    const kicker = "THE FOUNDING DOCUMENT OF THE LIFE I AM CHOOSING ON PURPOSE";
    const kw = spacedWidth(f.uiBold, 7.5, kicker, 1.3);
    drawSpaced(p, kicker, (PW - kw) / 2, PH - t, f.uiBold, 7.5, C.terra, 1.3);
    t += 62;
    drawCentered(p, "My LifeCharter", PW / 2, PH - t, f.display, 54, C.teal);
    t += 46;
    const who = wrap(f.displayItalic, 26, CW, input.name)[0] ?? "";
    drawCentered(p, who, PW / 2, PH - t, f.displayItalic, 26, C.ink);
    t += 24;
    if (input.className) {
      const cls = pdfSafe(f.ui, `${input.className} class`).toUpperCase();
      const w = spacedWidth(f.ui, 8, cls, 1.2);
      drawSpaced(p, cls, (PW - w) / 2, PH - t, f.ui, 8, C.soft, 1.2);
      t += 22;
    }
    p.drawLine({ start: { x: PW / 2 - 40, y: PH - t }, end: { x: PW / 2 + 40, y: PH - t }, thickness: 0.8, color: C.gold });
    t += 22;
    const status = signing
      ? `${signing.kind === "renewal" ? `Renewed ${dateLong(signing.signedOn)}` : `Signed ${dateLong(signing.signedOn)}`}  ·  Renewal ${dateLong(signing.renewalDueOn)}`
      : `In progress${input.asOf ? `  ·  as of ${dateLong(input.asOf)}` : ""}  ·  not yet signed`;
    const sw = spacedWidth(f.ui, 8, pdfSafe(f.ui, status).toUpperCase(), 0.9);
    drawSpaced(p, pdfSafe(f.ui, status).toUpperCase(), (PW - sw) / 2, PH - t, f.ui, 8, signing ? C.teal : C.terra, 0.9);
    t += 40;

    // Charter Statement card
    const inner = CW - 2 * 44;
    const stmt = doc.statement ? wrap(f.displayItalic, 21, inner, doc.statement) : wrap(f.bodyItalic, 12, inner, "My Charter Statement is still being written.");
    const lh = doc.statement ? 28 : 18;
    const h = 28 + 20 + stmt.length * lh + 26;
    card(p, MX, t, CW, h, { fill: C.blushSoft });
    const lab = "MY CHARTER STATEMENT";
    const labW = spacedWidth(f.uiBold, 7.5, lab, 1.3);
    drawSpaced(p, lab, (PW - labW) / 2, PH - (t + 34), f.uiBold, 7.5, C.terra, 1.3);
    stmt.forEach((line, i) => {
      const y = PH - (t + 28 + 20 + i * lh + lh * 0.72);
      drawCentered(p, line, PW / 2, y, doc.statement ? f.displayItalic : f.bodyItalic, doc.statement ? 21 : 12, doc.statement ? C.teal : C.soft);
    });

    const ew = 54;
    p.drawImage(emblem, { x: (PW - ew) / 2, y: 92, width: ew, height: ew });
    drawCentered(p, "Head up. Wings out.", PW / 2, 74, f.displayItalic, 15, C.teal);
  }

  // ---- Flowing pages: ratings, chapters, then the signing page
  let page = newPage();
  let top = TOP;
  const nextPage = () => {
    page = newPage();
    top = TOP;
  };

  function place(blocks: Block[], opts: { fill?: ReturnType<typeof rgb> } = {}) {
    let segTop = top;
    let items: { b: Block; at: number }[] = [];
    let cursor = top + PAD;
    const close = () => {
      const h = cursor + PAD - segTop;
      card(page, MX, segTop, CW, h, { fill: opts.fill });
      for (const it of items) it.b.draw(page, MX + PAD, it.at, CW - 2 * PAD);
      items = [];
      return segTop + h;
    };
    blocks.forEach((b, i) => {
      const need = b.h + (b.keepNext ? (blocks[i + 1]?.h ?? 0) : 0);
      if (cursor + need + PAD > LIMIT && items.length > 0) {
        close();
        nextPage();
        segTop = top;
        cursor = top + PAD;
      }
      items.push({ b, at: cursor });
      cursor += b.h;
    });
    top = close() + GAP;
  }

  /** Make sure `h` points fit on this page, otherwise start a new one. */
  const room = (h: number) => {
    if (top + h > LIMIT) nextPage();
  };

  const line = (font: PDFFont, size: number, lh: number, color: ReturnType<typeof rgb>, text: string, opts: { keepNext?: boolean; spaced?: number; center?: boolean } = {}): Block => ({
    h: lh,
    keepNext: opts.keepNext,
    draw: (p, x, t, w) => {
      const y = base(t, lh, size);
      if (opts.spaced) drawSpaced(p, text, opts.center ? x + (w - spacedWidth(font, size, text, opts.spaced)) / 2 : x, y, font, size, color, opts.spaced);
      else p.drawText(text, { x: opts.center ? x + (w - font.widthOfTextAtSize(text, size)) / 2 : x, y, size, font, color });
    },
  });
  const spacer = (h: number): Block => ({ h, draw: () => {} });
  const paragraph = (font: PDFFont, size: number, lh: number, color: ReturnType<typeof rgb>, text: string, w = CW - 2 * PAD, center = false): Block[] =>
    wrap(font, size, w, text).map((l) => line(font, size, lh, color, l, { center }));
  const eyebrow = (text: string, keepNext = true) => line(f.uiBold, 7.5, 14, C.terra, pdfSafe(f.uiBold, text).toUpperCase(), { spaced: 1.2, keepNext });

  // ---- Where I started, where I am
  const rated = doc.ratings.some((r) => r.start !== null || r.end !== null) || (signing?.renewalRatings && Object.keys(signing.renewalRatings).length > 0);
  if (rated) {
    room(300);
    const renewal = signing?.renewalRatings ?? null;
    const blocks: Block[] = [
      eyebrow("Look how far you've traveled"),
      line(f.display, 28, 36, C.teal, "Where I started, where I am", { keepNext: true }),
      ...paragraph(f.body, 10.5, 16, C.soft, "Each dimension rated from 1 (hurts or feels empty) to 10 (thriving exactly as I would want). Honest, not harsh."),
      spacer(6),
      {
        h: 16,
        draw: (p, x, t) => {
          const y = base(t, 16, 7.5);
          let cx = x;
          const items: [ReturnType<typeof rgb>, string][] = [[C.stone, "WEEK 0"], [C.teal, "WEEK 12"], ...(renewal ? ([[C.terraSoft, "RENEWAL"]] as [ReturnType<typeof rgb>, string][]) : [])];
          for (const [col, label] of items) {
            p.drawRectangle({ x: cx, y: y - 1, width: 12, height: 6, color: col });
            drawSpaced(p, label, cx + 17, y, f.uiBold, 7, C.soft, 0.9);
            cx += 17 + spacedWidth(f.uiBold, 7, label, 0.9) + 20;
          }
        },
      },
    ];
    let stage = "";
    for (const r of doc.ratings) {
      if (r.stage !== stage) {
        stage = r.stage;
        blocks.push(spacer(4), line(f.displayItalic, 14, 20, C.teal, pdfSafe(f.displayItalic, stage), { keepNext: true }));
      }
      const rn = renewal?.[r.dimension] ?? null;
      const bars: [number | null, ReturnType<typeof rgb>][] = [[r.start, C.stone], [r.end, C.teal], ...(renewal ? ([[rn, C.terraSoft]] as [number | null, ReturnType<typeof rgb>][]) : [])];
      const rowH = 12 + bars.length * 7;
      blocks.push({
        h: rowH,
        draw: (p, x, t, w) => {
          const labelW = 150;
          p.drawText(pdfSafe(f.ui, r.dimension), { x, y: PH - (t + rowH / 2 - 3 + 7), size: 8.5, font: f.ui, color: C.ink });
          const bx = x + labelW;
          const bw = w - labelW - 62;
          p.drawRectangle({ x: bx, y: PH - (t + rowH - 4), width: bw, height: rowH - 8, color: C.line, opacity: 0.5 });
          bars.forEach(([v, col], i) => {
            if (v === null) return;
            const by = PH - (t + 6 + i * 7 + 5);
            p.drawRectangle({ x: bx, y: by, width: (bw * v) / 10, height: 5, color: col });
          });
          // The numbers, right of the bars: "3 to 8", or "3 to 8 to 9" once renewed.
          const label = bars.map(([v]) => (v === null ? "-" : String(v))).join(" to ");
          p.drawText(label, { x: bx + bw + 8, y: PH - (t + rowH / 2 + 3), size: 7.5, font: f.uiBold, color: C.teal });
        },
      });
    }
    place(blocks);
  }

  // ---- Chapters
  for (const ch of doc.chapters) {
    const blocks: Block[] = [eyebrow(`Dimension ${ch.n} of 12 · ${ch.stage}`), line(f.display, 26, 34, C.teal, pdfSafe(f.display, ch.dimension), { keepNext: true }), spacer(4)];
    if (!ch.written) {
      blocks.push(...paragraph(f.bodyItalic, 11, 17, C.soft, "Not written yet."));
    } else {
      for (const r of ch.rows) {
        blocks.push(spacer(6), eyebrow(r.label, true));
        if (r.parts.length === 0) blocks.push(line(f.bodyItalic, 10.5, 16, C.soft, "…"));
        else
          r.parts.forEach((part, i) => {
            if (i > 0) blocks.push(spacer(3));
            blocks.push(...paragraph(f.body, 10.5, 16, C.ink, part));
          });
      }
    }
    // Start on a fresh page when only the header would fit.
    room(34 + 14 + 4 + 14 + 3 * 16 + 2 * PAD);
    place(blocks);
  }

  // ---- The signing page
  nextPage();
  {
    const p = page;
    const ew = 58;
    p.drawImage(emblem, { x: (PW - ew) / 2, y: PH - (top + ew), width: ew, height: ew });
    top += ew + 12;
    const k = "THE FOUNDING DOCUMENT OF THE LIFE I AM CHOOSING ON PURPOSE";
    const kw = spacedWidth(f.uiBold, 7, k, 1.2);
    drawSpaced(p, k, (PW - kw) / 2, PH - (top + 8), f.uiBold, 7, C.terra, 1.2);
    top += 20;
    drawCentered(p, "My LifeCharter", PW / 2, PH - (top + 34), f.display, 38, C.teal);
    top += 54;
    if (signing && signing.kind === "renewal") {
      const t = `RENEWAL  ·  VERSION ${signing.version}`;
      const w = spacedWidth(f.uiBold, 7.5, t, 1.2);
      drawSpaced(p, t, (PW - w) / 2, PH - (top + 6), f.uiBold, 7.5, C.soft, 1.2);
      top += 16;
    }

    const decl = declaration(signing?.signedName ?? "");
    const stmtLines = doc.statement ? wrap(f.displayItalic, 17, CW - 2 * PAD - 10, doc.statement) : [];
    const written = new Set(doc.chapters.filter((c) => c.written).map((c) => c.n));

    // Declaration + statement + chapter checklist in one card
    const blocks: Block[] = [
      ...paragraph(f.body, 11.5, 18.5, C.ink, decl, CW - 2 * PAD, true),
      spacer(10),
      line(f.uiBold, 7.5, 14, C.terra, "MY CHARTER STATEMENT", { spaced: 1.2, center: true }),
      ...(stmtLines.length
        ? stmtLines.map((l) => line(f.displayItalic, 17, 23, C.teal, l, { center: true }))
        : [line(f.bodyItalic, 11, 18, C.soft, "Still being written.", { center: true })]),
      spacer(12),
      {
        h: 6 * 20 + 4,
        draw: (pg, x, t, w) => {
          doc.chapters.forEach((c, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cx = x + col * (w / 2);
            const cy = PH - (t + row * 20 + 14);
            pg.drawRectangle({ x: cx, y: cy - 1, width: 10, height: 10, borderColor: C.gold, borderWidth: 0.9 });
            if (written.has(c.n)) {
              pg.drawLine({ start: { x: cx + 2, y: cy + 4 }, end: { x: cx + 4.2, y: cy + 1.6 }, thickness: 1.3, color: C.teal });
              pg.drawLine({ start: { x: cx + 4.2, y: cy + 1.6 }, end: { x: cx + 8.4, y: cy + 8 }, thickness: 1.3, color: C.teal });
            }
            pg.drawText(pdfSafe(f.ui, `${c.n}. ${c.dimension}`), { x: cx + 17, y: cy, size: 8.5, font: f.ui, color: C.ink });
          });
        },
      },
    ];
    const bodyH = blocks.reduce((s, b) => s + b.h, 0) + 2 * PAD;
    card(p, MX, top, CW, bodyH);
    let cur = top + PAD;
    for (const b of blocks) {
      b.draw(p, MX + PAD, cur, CW - 2 * PAD);
      cur += b.h;
    }
    top += bodyH + GAP + 6;

    // Signature, date, witness, renewal
    const commitment = signing ? wrap(f.bodyItalic, 11, CW, `My commitment: ${signing.commitment}`) : [];
    const sigH = 74 + (commitment.length ? commitment.length * 16 + 10 : 0);
    if (top + sigH > LIMIT) {
      nextPage();
    }
    const q = page;
    const colW = (CW - 24) / 2;
    const cell = (x: number, y: number, label: string, value: string | null, font: PDFFont, size: number) => {
      if (value) q.drawText(value, { x, y: PH - (y + 26), size, font, color: C.teal });
      q.drawLine({ start: { x, y: PH - (y + 34) }, end: { x: x + colW, y: PH - (y + 34) }, thickness: 0.8, color: C.ink });
      drawSpaced(q, label.toUpperCase(), x, PH - (y + 46), f.ui, 6.8, C.soft, 1);
    };
    const sy = top;
    cell(MX, sy, "Signature", signing ? wrap(f.displayItalic, 24, colW, signing.signedName)[0] : null, f.displayItalic, 24);
    cell(MX + colW + 24, sy, "Date", signing ? dateLong(signing.signedOn) : null, f.body, 12);
    cell(MX, sy + 62, "Witness (optional)", signing?.witness ? wrap(f.displayItalic, 18, colW, signing.witness)[0] : null, f.displayItalic, 18);
    cell(MX + colW + 24, sy + 62, "Charter Renewal date", signing ? dateLong(signing.renewalDueOn) : null, f.body, 12);
    let y = sy + 62 + 62;
    commitment.forEach((l) => {
      q.drawText(l, { x: MX, y: PH - (y + 12), size: 11, font: f.bodyItalic, color: C.ink });
      y += 16;
    });
    drawCentered(q, "Head up. Wings out.", PW / 2, PH - (y + 30), f.displayItalic, 17, C.teal);
  }

  // ---- Footers (every page except the cover) and the optional preview banner
  const total = pages.length;
  pages.forEach((p, i) => {
    if (input.banner) {
      const b = pdfSafe(f.uiBold, input.banner).toUpperCase();
      const w = spacedWidth(f.uiBold, 6.5, b, 1);
      p.drawRectangle({ x: (PW - w) / 2 - 10, y: PH - 27, width: w + 20, height: 15, color: C.blush, opacity: 0.9 });
      drawSpaced(p, b, (PW - w) / 2, PH - 22, f.uiBold, 6.5, C.terra, 1);
    }
    if (i === 0) return;
    p.drawLine({ start: { x: MX, y: 44 }, end: { x: PW - MX, y: 44 }, thickness: 0.6, color: C.gold });
    const left = pdfSafe(f.ui, `THE LIFECHARTER PROGRAM  ·  MY LIFECHARTER`);
    drawSpaced(p, left, MX, 32, f.ui, 6.5, C.soft, 0.8);
    const right = `© 2026 Sacred Kaleidoscope Community LLC  ·  Page ${i + 1} of ${total}`;
    p.drawText(right, { x: PW - MX - f.ui.widthOfTextAtSize(right, 6.5), y: 32, size: 6.5, font: f.ui, color: C.soft });
  });

  return pdf.save();
}

