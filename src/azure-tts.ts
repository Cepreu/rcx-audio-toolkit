import { getDefaultAzureTtsVoice } from "./types";

const defaultTtsEndpoint = "https://{region}.tts.speech.microsoft.com/cognitiveservices/v1";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function resolveVoice(languageCode: string, voice?: string): string {
  const trimmedVoice = voice?.trim();
  if (trimmedVoice) return trimmedVoice;
  return getDefaultAzureTtsVoice(languageCode);
}

export async function synthesizeTextToSpeech(text: string, languageCode: string, voice?: string): Promise<ArrayBuffer> {
  const key = Bun.env.AZURE_TTS_KEY ?? Bun.env.AZURE_TRANSLATOR_KEY;
  const region = Bun.env.AZURE_TTS_REGION ?? Bun.env.AZURE_TRANSLATOR_REGION;
  if (!key || !region) {
    throw new Error("Missing required environment variables: AZURE_TTS_KEY/AZURE_TTS_REGION or AZURE_TRANSLATOR_KEY/AZURE_TRANSLATOR_REGION");
  }

  const normalizedLanguageCode = languageCode.replace("_", "-");
  const selectedVoice = resolveVoice(languageCode, voice);
  const endpoint = new URL(defaultTtsEndpoint.replace("{region}", region));

  const looksLikeSsml = /<speak\b|<voice\b|<prosody\b|<break\b/i.test(text.trim());
  const ssml = looksLikeSsml
    ? text
    : [
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='",
        normalizedLanguageCode,
        "'><voice xml:lang='",
        normalizedLanguageCode,
        "' xml:gender='Female' name='",
        selectedVoice,
        "'>",
        escapeXml(text),
        "</voice></speak>",
      ].join("");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "Ocp-Apim-Subscription-Key": key,
      "User-Agent": "rcx-audio-toolkit",
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Azure TTS failed (${response.status}): ${errorBody}`);
  }

  return response.arrayBuffer();
}
