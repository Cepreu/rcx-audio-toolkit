export type AudioRow = {
  file: string;
  audioName: string;
  locale: string;
};

export {
  Channel,
  digitalChannels,
  supportedLanguages,
} from "./Prompt/prompt-types";

export type {
  ChannelPrompts,
  DigitalChannelPrompts,
  DigitalPrompt,
  FileVoicePrompt,
  Prompt,
  SupportedLanguage,
  TtsVoicePrompt,
  VoiceChannelPrompts,
  VoicePrompt,
} from "./Prompt/prompt-types";
