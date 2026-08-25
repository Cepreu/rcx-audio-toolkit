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
└── src/
    ├── index.ts           # CLI entry point (argument parsing)
    ├── auth.ts            # Authorization module (token exchange)
    ├── upload.ts          # Upload command implementation
    ├── utils.ts           # Shared utilities (env, CSV, file I/O)
    └── types.ts           # Shared TypeScript types
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

More commands (e.g. `delete`, `list`) can be added in future.

---

## Setup

Before running commands, complete the Quick Start section above, then follow these steps:

### 1. Prepare the CSV file

Create a `files.csv` in the root directory:

```
File,AudioName,Locale
hold_time_10_es_419.wav,hold_time_10,es_419
hold_time_20_es_419.wav,hold_time_20,es_419
welcome_es_419.wav,welcome,es_419
```

| Column | Description |
|--------|-------------|
| `File` | Filename only — path is provided separately as a parameter |
| `AudioName` | Name to register the audio as in RingCX |
| `Locale` | Language/locale code (e.g. `es_419`, `en_US`) |

### 2. Place audio files

Put all `.wav` files in a single directory, e.g.:
- macOS/Linux: `/Users/sergei/audio`
- Windows: `C:\audio`

### 3. (Optional) Create `.env` for automatic token fetching

> Only needed if you plan to use `--auto-token` / `-AutoToken`.
> If you prefer to copy-paste a token from the browser or Postman, skip this step.

Create a `.env` file in the root directory:

```
RINGCENTRAL_CLIENT_ID=your_client_id
RINGCENTRAL_CLIENT_SECRET=your_client_secret
RINGCENTRAL_JWT=your_jwt_assertion
```

> ⚠️ Never commit `.env` to git. It is already in `.gitignore`.

Alternatively, set variables in your terminal session:

```bash
export RINGCENTRAL_CLIENT_ID=your_client_id
export RINGCENTRAL_CLIENT_SECRET=your_client_secret
export RINGCENTRAL_JWT=your_jwt_assertion
```

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
