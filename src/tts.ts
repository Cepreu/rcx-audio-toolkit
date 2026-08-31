import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveVoice, synthesizeTextToSpeech } from "./azure-tts";

export type TtsRow = {
  promptName: string;
  promptText: string;
  languageCode: string;
  voice?: string;
  channel?: string;
};

export type UploadCsvRow = {
  File: string;
  AudioName: string;
  Locale: string;
};

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("Invalid CSV: unterminated quoted field");
  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function parseTtsCsv(csv: string): TtsRow[] {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const promptNameIndex = headers.indexOf("promptname");
  const promptTextIndex = headers.indexOf("prompttext");
  const languageCodeIndex = headers.indexOf("languagecode");
  const channelIndex = headers.indexOf("channel");
  const voiceIndex = headers.indexOf("voice");
  if (promptNameIndex < 0 || promptTextIndex < 0 || languageCodeIndex < 0) {
    throw new Error("Invalid CSV header: expected PromptName,Channel,PromptText,LanguageCode[,Voice]");
  }

  const parsedRows: Array<TtsRow | undefined> = rows.slice(1).map((row, rowIndex) => {
    const promptName = row[promptNameIndex]?.trim();
    const promptText = row[promptTextIndex]?.trim();
    const languageCode = row[languageCodeIndex]?.trim();
    const channel = channelIndex >= 0 ? row[channelIndex]?.trim() : undefined;
    const voice = voiceIndex >= 0 ? row[voiceIndex]?.trim() : undefined;
    if (!promptName || !promptText || !languageCode) {
      throw new Error(`Invalid CSV row ${rowIndex + 2}: PromptName, PromptText, and LanguageCode are required`);
    }
    if (channel && channel !== "voice") return undefined;
    return { promptName, promptText, languageCode, voice, channel };
  });

  return parsedRows.filter((row): row is TtsRow => !!row && (!row.channel || row.channel === "voice"));
}

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export async function generateTtsFiles(inputCsvFile: string, outputDirectory: string): Promise<string> {
  const rows = parseTtsCsv(await Bun.file(inputCsvFile).text());
  await mkdir(outputDirectory, { recursive: true });

  const uploadRows: { File: string; AudioName: string; Locale: string }[] = [];

  for (const row of rows) {
    const selectedVoice = resolveVoice(row.languageCode, row.voice);
    const audioBuffer = await synthesizeTextToSpeech(row.promptText, row.languageCode, selectedVoice);
    const fileName = `${row.promptName}-${row.languageCode.replace(/[^a-zA-Z0-9]+/g, "_")}.mp3`;
    const filePath = join(outputDirectory, fileName);
    await writeFile(filePath, Buffer.from(audioBuffer));

    uploadRows.push({
      File: fileName,
      AudioName: row.promptName,
      Locale: row.languageCode,
    });

    console.log(`✅ ${row.promptName} (${row.languageCode}) -> ${fileName}`);
  }

  const uploadCsv = ["File,AudioName,Locale"]
    .concat(uploadRows.map((row) => [row.File, row.AudioName, row.Locale].map(csvEscape).join(",")))
    .join("\n") + "\n";

  const uploadCsvPath = join(outputDirectory, "upload_prompts.csv");
  await writeFile(uploadCsvPath, uploadCsv);
  return uploadCsvPath;
}
