import "server-only";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { WEEKS } from "./curriculum";

const ROOT = process.cwd();

/**
 * The lesson transcript for a week: the spoken script without Babs's recording notes
 * or the app/workbook checklist at the end.
 */
export async function lessonTranscript(n: number) {
  const meta = WEEKS[n];
  const src = await readFile(path.join(ROOT, "content/lessons", `${meta.lesson}.md`), "utf8");
  const afterNotes = src.split(/\n---\s*\n/).slice(1).join("\n---\n");
  const script = afterNotes.split(/\n##\s+App \/ workbook/)[0];
  return script.replace(/\n---\s*$/, "").trim();
}

/** Path of the printable handout PDF for a week. */
export async function handoutPath(n: number) {
  const dir = path.join(ROOT, "handouts/pdf");
  const prefix = `LifeCharter-Week-${String(n).padStart(2, "0")}-`;
  const file = (await readdir(dir)).find((f) => f.startsWith(prefix) && f.endsWith(".pdf"));
  return file ? { file, full: path.join(dir, file) } : null;
}
