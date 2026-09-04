import { type SupportedLanguage } from "./types";

const defaultTranslatorEndpoint = "https://api.cognitive.microsofttranslator.com";

type AzureTranslationResponse = Array<{
  translations?: Array<{ text?: string; to?: string }>;
}>;

export function azureLocale(localeCode: string): string {
  return localeCode.replace("_", "-");
}

export async function translateText(text: string, language: SupportedLanguage): Promise<string> {
  const key = Bun.env.AZURE_TRANSLATOR_KEY;
  const region = Bun.env.AZURE_TRANSLATOR_REGION;
  if (!key || !region) {
    throw new Error("Missing required environment variables: AZURE_TRANSLATOR_KEY, AZURE_TRANSLATOR_REGION");
  }

  const endpoint = Bun.env.AZURE_TRANSLATOR_ENDPOINT ?? defaultTranslatorEndpoint;
  const url = new URL("/translate", endpoint);
  url.searchParams.set("api-version", "3.0");
  url.searchParams.set("from", "en");
  url.searchParams.set("to", azureLocale(language.localeCode));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": key,
      "Ocp-Apim-Subscription-Region": region,
    },
    body: JSON.stringify([{ Text: text }]),
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`Azure translation failed (${response.status}): ${body}`);

  const json = JSON.parse(body) as AzureTranslationResponse;
  const translatedText = json[0]?.translations?.[0]?.text;
  if (!translatedText) throw new Error("Azure translation response did not contain translated text");
  return translatedText;
}
