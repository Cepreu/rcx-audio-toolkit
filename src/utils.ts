import { join } from "node:path";
import type { AudioRow } from "./types";

export async function loadEnv(directory: string): Promise<void> {
  const envPath = join(directory, ".env");
  try {
    const content = await Bun.file(envPath).text();
    if (!content.trim()) return;

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
      if (Bun.env[match[1]] === undefined) Bun.env[match[1]] = value;
    }
  } catch {
    console.log(`⚠️  File ${envPath} doesn't exist or can't be read; continue without .env`);
  }
}

export async function requireText(path: string): Promise<string> {
  return Bun.file(path).text();
}

export function parseCsv(csv: string): AudioRow[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];

  return lines.slice(1).map((line, lineIndex) => {
    const columns = line.split(",").map((value) => value.trim());
    if (columns.length < 3 || columns.slice(0, 3).some((value) => value === "")) {
      throw new Error(`Invalid CSV row ${lineIndex + 2}: expected File,AudioName,Locale`);
    }
    return { file: columns[0], audioName: columns[1], locale: columns[2] };
  });
}
