import { Channel, supportedLanguages, type SupportedLanguage } from "./types";
import { azureLocale, translateText } from "./azure-translation";
import { requireText } from "./utils";

type TranslationInput = {
  promptName: string;
  channel: Channel;
  text: string;
};

export type TranslationOutput = {
  promptName: string;
  channel: Channel;
  languageCode: string;
  translatedText: string;
};

type AzureTranslationResponse = Array<{
  translations?: Array<{ text?: string; to?: string }>;
}>;

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

function parseTranslationCsv(csv: string): TranslationInput[] {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const promptNameIndex = headers.indexOf("promptname");
  const channelIndex = headers.indexOf("channel");
  const textIndex = headers.indexOf("text");
  if (promptNameIndex < 0 || channelIndex < 0 || textIndex < 0) {
    throw new Error("Invalid CSV header: expected PromptName,Channel,Text");
  }

  return rows.slice(1).map((row, rowIndex) => {
    const promptName = row[promptNameIndex]?.trim();
    const channelValue = row[channelIndex]?.trim();
    const text = row[textIndex]?.trim();
    if (!promptName || !channelValue || !text) {
      throw new Error(`Invalid CSV row ${rowIndex + 2}: PromptName, Channel, and Text are required`);
    }

    if (!Object.values(Channel).includes(channelValue as Channel)) {
      throw new Error(`Invalid CSV row ${rowIndex + 2}: unsupported channel "${channelValue}"`);
    }
    return { promptName, channel: channelValue as Channel, text };
  });
}

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function selectLanguages(languageCodes?: string): SupportedLanguage[] {
  if (!languageCodes) return supportedLanguages;

  const requestedCodes = languageCodes.split(",").map((code) => code.trim()).filter(Boolean);
  if (requestedCodes.length === 0) throw new Error("Language list must contain at least one language code");

  const selectedLanguages = requestedCodes.map((requestedCode) => {
    const language = supportedLanguages.find(
      (supportedLanguage) => azureLocale(supportedLanguage.localeCode).toLowerCase() === azureLocale(requestedCode).toLowerCase(),
    );
    if (!language) throw new Error(`Unsupported language code "${requestedCode}"`);
    return language;
  });

  return [...new Map(selectedLanguages.map((language) => [language.localeCode, language])).values()];
}

export async function translateCsv(inputCsvFile: string, outputCsvFile: string, languageCodes?: string): Promise<void> {
  const inputs = parseTranslationCsv(await requireText(inputCsvFile));
  const languages = selectLanguages(languageCodes);
  const output: TranslationOutput[] = [];

  for (const input of inputs) {
    for (const language of languages) {
      const translatedText = await translateText(input.text, language);
      output.push({
        promptName: input.promptName,
        channel: input.channel,
        languageCode: language.localeCode,
        translatedText,
      });
      console.log(`✅ ${input.promptName} (${input.channel}) (${language.localeCode}) — translated`);
    }
  }

  const lines = ["PromptName,Channel,LanguageCode,PromptText"];
  for (const row of output) {
    lines.push([row.promptName, row.channel, row.languageCode, row.translatedText].map(csvEscape).join(","));
  }
  await Bun.write(outputCsvFile, `${lines.join("\n")}\n`);
}
