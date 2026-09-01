# RingCX Audio Toolkit

A cross-platform toolkit for bulk management of RingCX audio prompts via the RingCX Admin API.

---

## File Structure

```
rcx-audio-toolkit/
├── package.json            # Bun project configuration
├── tsconfig.json           # TypeScript configuration
├── rcx-audio.sh           # Optional — macOS / Linux compatibility launcher
├── .env                   # Optional — credentials for auto-token mode
├── files.csv              # List of files to upload
├── test/
│   ├── translation_input.csv
│   └── tts_input.csv
└── src/
    ├── index.ts           # CLI entry point (argument parsing)
    ├── auth.ts            # Authorization module (token exchange)
    ├── upload.ts          # Upload command implementation
    ├── translation.ts     # Generic translation orchestration
    ├── azure-translation.ts # Azure Translator provider
    ├── azure-tts.ts       # Azure TTS provider
    ├── tts.ts             # TTS generation and upload CSV creation
    ├── utils.ts           # Shared utilities (env, CSV, file I/O)
    ├── types.ts           # Shared TypeScript types
    └── Prompt/
        └── prompt-types.ts # Language, channel, and prompt model definitions
```

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Cepreu/rcx-audio-toolkit.git
cd rcx-audio-toolkit
```

### 2. Install Bun (if not already installed)

Install Bun from [bun.sh](https://bun.sh):

```bash
curl -fsSL https://bun.sh/install | bash
```

### 3. Install project dependencies

```bash
bun install
```

---

## Supported Commands

| Command | Description |
|---------|-------------|
| `upload` | Bulk upload audio files from a CSV list |
| `translate` | Translate text into all or selected supported languages |
| `tts` | Generate MP3 files from prompt text using Azure TTS |

More commands (e.g. `delete`, `list`) can be added in future.

---

## Setup

Before running any command, complete the Quick Start section above. Then follow the setup steps for the command you want to use.

### Upload setup

Use this setup for the `upload` command.

1. Prepare the RingCX upload CSV.

```csv
File,AudioName,Locale
hold_time_10_es_419.wav,hold_time_10,es_419
hold_time_20_es_419.wav,hold_time_20,es_419
welcome_es_419.wav,welcome,es_419
```

| Column | Description |
|--------|-------------|
| `File` | Filename only — path is provided separately as a parameter |
| `AudioName` | Label to register in RingCX |
| `Locale` | Language/locale code such as `es_419` or `en_US` |

2. Place the audio files in a single folder, for example:
- macOS/Linux: `/Users/sergei/audio`
- Windows: `C:\audio`

3. Configure RingCentral credentials if you want to use `--auto-token`.

Create a `.env` file in the project root:

```env
RINGCENTRAL_CLIENT_ID=your_client_id
RINGCENTRAL_CLIENT_SECRET=your_client_secret
RINGCENTRAL_JWT=your_jwt_assertion
```

Or set them in the terminal:

```bash
export RINGCENTRAL_CLIENT_ID=your_client_id
export RINGCENTRAL_CLIENT_SECRET=your_client_secret
export RINGCENTRAL_JWT=your_jwt_assertion
```

> ⚠️ Never commit `.env` to git. It is already ignored.

4. Choose how you will authenticate:
- Paste a RingCX Bearer token manually when prompted
- Or run with `--auto-token` after setting the `.env` values

---

### Translate setup

Use this setup for the `translate` command.

1. Prepare your input CSV with prompt text.

```csv
PromptName,Channel,Text
Welcome,voice,Welcome to our support line.
Goodbye,email,"Thank you for contacting us, and have a great day."
```

Required columns:
- `PromptName`: unique prompt identifier
- `Channel`: channel type such as `voice`, `email`, `webpage-chat`
- `Text`: source text to translate

2. Configure Azure Translator credentials.

```env
AZURE_TRANSLATOR_KEY=your_translator_key
AZURE_TRANSLATOR_REGION=your_resource_region
```

Optional:

```env
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
```

3. Run the translation command.

```bash
bun src/index.ts translate prompts.csv translated-prompts.csv
```

You can restrict the output to specific locales:

```bash
bun src/index.ts translate prompts.csv translated-prompts.csv --languages es-ES,fr-FR,ja-JP
```

> The output format is `PromptName,Channel,LanguageCode,PromptText`.

---

### TTS setup

Use this setup for the `tts` command.

1. Prepare an input CSV for text-to-speech.

```csv
PromptName,Channel,PromptText,LanguageCode,Voice
Welcome,voice,Welcome to our support line.,en-US,
Goodbye,voice,Merci pour votre demande.,fr-FR,
```

Required columns:
- `PromptName`: prompt name used in the generated upload CSV
- `Channel`: expected to be `voice`
- `PromptText`: text or SSML to synthesize
- `LanguageCode`: locale such as `en-US`, `fr-FR`, or `ko_KR`
- `Voice`: optional custom Azure voice name

2. Configure Azure TTS credentials.

```env
AZURE_TTS_KEY=your_tts_key
AZURE_TTS_REGION=your_tts_region
```

If these are not set, the project falls back to:

```env
AZURE_TRANSLATOR_KEY=your_translator_key
AZURE_TRANSLATOR_REGION=your_resource_region
```

3. Create a target output directory and run the command.

```bash
mkdir -p output
bun src/index.ts tts prompts.csv output
```

The command produces:
- one MP3 file per prompt
- `upload_prompts.csv` in the output folder for RingCX upload

> Non-voice rows are ignored during TTS generation, but they can remain in the translated output for review.

---

## Usage

### upload — Manual token entry (no setup required)

The simplest way to run — copy a Bearer token from your browser (DevTools → Network tab) or Postman and paste it when prompted.

**Direct Bun:**
```bash
bun src/index.ts upload /Users/sergei/audio files.csv 2114002
```

**Optional — via shell launcher (macOS / Linux):**
```bash
./rcx-audio.sh upload /Users/sergei/audio files.csv 2114002
```

You will be prompted:
```
🔑 Enter Bearer token:
```

---

### upload — Auto token (requires `.env`)

Fetches a fresh RingCX token automatically — useful for frequent runs. Requires `.env` or environment variables to be set (see Setup step 3).

**Direct Bun:**
```bash
bun src/index.ts upload /Users/sergei/audio files.csv 2114002 --auto-token
```

**Optional — via shell launcher (macOS / Linux):**
```bash
./rcx-audio.sh upload /Users/sergei/audio files.csv 2114002 --auto-token
```

### translate — Translate prompt text

The input CSV must contain `PromptName`, `Channel`, and `Text` columns. `Channel` must be one of the supported channel values, such as `voice`, `email`, or `webpage-chat`. Text containing commas or line breaks may be quoted using standard CSV quoting.

```csv
PromptName,Channel,Text
Welcome,voice,Welcome to our support line.
Goodbye,email,"Thank you for contacting us, and have a great day."
```

Run the translation command:

```bash
bun src/index.ts translate prompts.csv translated-prompts.csv
```

By default, the command translates into every supported language. To select specific language codes, provide a comma-separated list with `--languages`:

```bash
bun src/index.ts translate prompts.csv translated-prompts.csv --languages es-ES,fr-FR,ja-JP
```

Both hyphenated and underscored codes are accepted, for example `ko-KR` or `ko_KR`.

The output file uses the following contract:

```csv
PromptName,Channel,LanguageCode,PromptText
Welcome,voice,en-US,Welcome to our support line.
Goodbye,email,fr-FR,Merci pour votre demande.
```

This output is intentionally compatible with the TTS input flow for voice rows. Non-voice rows remain in the translation result for review and other channel-specific workflows, but the TTS command ignores them.

### tts — Generate MP3 prompts from Azure TTS

The TTS command reads a CSV with prompt text, language, and optional voice information and creates MP3 files in the output directory. It also generates an upload CSV in the same folder.

Input CSV format:

```csv
PromptName,Channel,PromptText,LanguageCode,Voice
Welcome,voice,Welcome to our support line.,en-US,
Goodbye,voice,Merci pour votre demande.,fr-FR,
```

Notes:
- `PromptName` is used as the prompt name in the RingCX upload CSV.
- `Channel` is expected to be `voice`; non-voice rows are ignored by the TTS flow.
- `LanguageCode` accepts locale codes such as `en-US`, `fr-FR`, or `ko_KR`.
- `Voice` is optional. If omitted, the toolkit uses the default Azure TTS voice for that language.

Run the command:

```bash
bun src/index.ts tts prompts.csv output_directory
```

The command produces:
- one MP3 per row in the target directory
- `upload_prompts.csv` in the same directory for the RingCX upload command

Example generated upload CSV:

```csv
File,AudioName,Locale
Welcome-en-US.mp3,Welcome,en-US
Goodbye-fr-FR.mp3,Goodbye,fr-FR
```

---

## Expected Output

```
� Validating token...
✅ RingCentral token received
✅ RingCX token received
✅ hold_time_10 (es_419) — uploaded
✅ hold_time_20 (es_419) — uploaded
❌ welcome (es_419) — failed (400): {"error":"file not found"}
```

---

## Tips

**Renaming files from one locale to another** (e.g. `es_MX` → `es_419`):

macOS / Linux:
```bash
for f in *_es_MX.wav; do mv "$f" "${f/_es_MX.wav/_es_419.wav}"; done
```

Windows:
```powershell
Get-ChildItem *_es_MX.wav | Rename-Item -NewName { $_.Name -replace '_es_MX\.wav','_es_419.wav' }
```

**Windows CSV line endings** — if the CSV was created on Windows and used on Mac/Linux, strip `\r`:
```bash
sed -i 's/\r//' files.csv
```

**Token expiry** — tokens expire after 1 hour. For large batches, use `--auto-token` to ensure a fresh token is fetched at the start of every run.

---

## Troubleshooting

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `Failed to get RingCentral token` | Wrong credentials or expired JWT | Check `.env` values; regenerate JWT from RingCentral Developer Console |
| `Failed to get RingCX token` | Account lacks RingCX access | Verify sub-account has RingCX provisioned |
| `401 Unauthorized` | Token expired | Re-run with `--auto-token` or paste a fresh token |
| `404 Not Found` | Wrong account ID | Verify the sub-account ID parameter |
| `400 Bad Request` | Filename mismatch or missing file | Check CSV filenames match files in the working directory exactly (case-sensitive on Mac/Linux) |
| Token prints as `null` | JWT expired | Generate a new JWT from RingCentral Developer Console |
