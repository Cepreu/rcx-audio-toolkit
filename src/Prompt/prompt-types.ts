export type SupportedLanguage = {
  language: string;
  localeCode: string;
};

export const supportedLanguages: SupportedLanguage[] = [
  { language: "German", localeCode: "de-DE" },
  { language: "English (U.K.)", localeCode: "en-GB" },
  { language: "English (U.S.)", localeCode: "en-US" },
  { language: "Spanish", localeCode: "es-ES" },
  { language: "Spanish (Latin America)", localeCode: "es-419" },
  { language: "French", localeCode: "fr-FR" },
  { language: "French (Canada)", localeCode: "fr-CA" },
  { language: "Italian", localeCode: "it-IT" },
  { language: "Dutch (Netherlands)", localeCode: "nl-NL" },
  { language: "Portuguese (Brazil)", localeCode: "pt-BR" },
  { language: "Portuguese (Portugal)", localeCode: "pt-PT" },
  { language: "Finnish", localeCode: "fi-FI" },
  { language: "Korean (South Korea)", localeCode: "ko_KR" },
  { language: "Japanese", localeCode: "ja-JP" },
  { language: "Simplified Chinese (PRC)", localeCode: "zh-CN" },
  { language: "Traditional Chinese (Taiwan)", localeCode: "zh-TW" },
  { language: "Traditional Chinese (Hong Kong)", localeCode: "zh-HK" },
];

export const defaultAzureTtsVoices: Record<string, string> = {
  "de-DE": "de-DE-KatjaNeural",
  "en-AU": "en-AU-NataschaNeural",
  "en-GB": "en-GB-SoniaNeural",
  "en-US": "en-US-JennyNeural",
  "es-ES": "es-ES-ElviraNeural",
  "es-419": "es-MX-DaliaNeural",
  "es-MX": "es-MX-DaliaNeural",
  "es-US": "es-US-PalomaNeural",
  "fr-FR": "fr-FR-DeniseNeural",
  "fr-CA": "fr-CA-SylvieNeural",
  "it-IT": "it-IT-ElsaNeural",
  "nl-NL": "nl-NL-ColetteNeural",
  "pt-BR": "pt-BR-FernandaNeural",
  "pt-PT": "pt-PT-RaquelNeural",
  "fi-FI": "fi-FI-NooraNeural",
  "ko_KR": "ko-KR-SunHiNeural",
  "ko-KR": "ko-KR-SunHiNeural",
  "ja-JP": "ja-JP-NanamiNeural",
  "zh-CN": "zh-CN-XiaoxiaoNeural",
  "zh-TW": "zh-TW-HsiaoChenNeural",
  "zh-HK": "zh-HK-HiuGaaiNeural",
};

export function getDefaultAzureTtsVoice(localeCode: string): string {
  const normalizedCode = localeCode.replace("_", "-");
  return defaultAzureTtsVoices[localeCode] ?? defaultAzureTtsVoices[normalizedCode] ?? "en-US-JennyNeural";
}

export enum Channel {
  Voice = "voice",
  XTwitter = "x-twitter",
  Facebook = "facebook",
  Email = "email",
  WebpageChat = "webpage-chat",
  GoogleMyBusiness = "google-my-business",
  Instagram = "instagram",
  RingCxMessaging = "ringcx-messaging",
  AppleMessagesForBusiness = "apple-messages-for-business",
  MicrosoftTeams = "microsoft-teams",
}

export const digitalChannels: Channel[] = [
  Channel.XTwitter,
  Channel.Facebook,
  Channel.Email,
  Channel.WebpageChat,
  Channel.GoogleMyBusiness,
  Channel.Instagram,
  Channel.RingCxMessaging,
  Channel.AppleMessagesForBusiness,
  Channel.MicrosoftTeams,
];

type PromptLanguage = {
  language: SupportedLanguage;
};

export type TtsVoicePrompt = PromptLanguage & {
  text: string;
  type: "TTS";
};

export type FileVoicePrompt = PromptLanguage & {
  text: string;
  type: "File";
  fileName: string;
};

export type VoicePrompt = TtsVoicePrompt | FileVoicePrompt;

export type DigitalPrompt = PromptLanguage & {
  text: string;
  attributes?: Record<string, string>;
};

export type VoiceChannelPrompts = {
  channel: Channel.Voice;
  prompts: VoicePrompt[];
};

export type DigitalChannelPrompts = {
  channel: Exclude<Channel, Channel.Voice>;
  prompts: DigitalPrompt[];
};

export type ChannelPrompts = VoiceChannelPrompts | DigitalChannelPrompts;

export type Prompt = {
  name: string;
  description: string;
  channels: ChannelPrompts[];
};
