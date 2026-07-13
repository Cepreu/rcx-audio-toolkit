# RingCX Audio Toolkit

A cross-platform toolkit for bulk management of RingCX audio prompts via the RingCX Admin API.

---

## File Structure

```
rcx-audio-toolkit/
├── rcx-audio.sh           # Entry point — macOS / Linux
├── rcx-audio.ps1          # Entry point — Windows
├── .env                   # Optional — credentials for auto-token mode
├── files.csv              # List of files to upload
└── src/
    ├── mac/
    │   ├── upload.sh
    │   └── get_token.sh
    └── windows/
        ├── upload.ps1
        └── get_token.ps1
```

---

## Supported Commands

| Command | Description |
|---------|-------------|
| `upload` | Bulk upload audio files from a CSV list |

More commands (e.g. `delete`, `list`) can be added in future.

---

## Setup

### 1. Make scripts executable (macOS / Linux only)

```bash
chmod +x rcx-audio.sh src/mac/upload.sh src/mac/get_token.sh
```

### 2. Allow script execution (Windows only)

Run once in PowerShell as Administrator:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 3. Prepare the CSV file

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

### 4. Place audio files

Put all `.wav` files in a single directory, e.g.:
- macOS/Linux: `/Users/sergei/audio`
- Windows: `C:\audio`

### 5. (Optional) Create `.env` for automatic token fetching

> Only needed if you plan to use `--auto-token` / `-AutoToken`.
> If you prefer to copy-paste a token from the browser or Postman, skip this step.

Create a `.env` file in the root directory:

```
RINGCENTRAL_CLIENT_ID=your_client_id
RINGCENTRAL_CLIENT_SECRET=your_client_secret
RINGCENTRAL_JWT=your_jwt_assertion
```

> ⚠️ Never commit `.env` to git. Add it to `.gitignore`:
> ```bash
> echo ".env" >> .gitignore
> ```

Alternatively, set variables in your terminal session without a file:

**macOS / Linux:**
```bash
export RINGCENTRAL_CLIENT_ID=your_client_id
export RINGCENTRAL_CLIENT_SECRET=your_client_secret
export RINGCENTRAL_JWT=your_jwt_assertion
```

**Windows:**
```powershell
$env:RINGCENTRAL_CLIENT_ID="your_client_id"
$env:RINGCENTRAL_CLIENT_SECRET="your_client_secret"
$env:RINGCENTRAL_JWT="your_jwt_assertion"
```

---

## Usage

### upload — Manual token entry (no setup required)

The simplest way to run — copy a Bearer token from your browser (DevTools → Network tab) or Postman and paste it when prompted. Input is hidden while typing.

**macOS / Linux:**
```bash
./rcx-audio.sh upload /Users/sergei/audio files.csv 2114002
```

**Windows:**
```powershell
.\rcx-audio.ps1 upload C:\audio files.csv 2114002
```

You will be prompted:
```
🔑 Enter Bearer token:
```

---

### upload — Auto token (requires `.env`)

Fetches a fresh RingCX token automatically — useful for frequent runs. Requires `.env` or environment variables to be set (see Setup step 5).

**macOS / Linux:**
```bash
./rcx-audio.sh upload /Users/sergei/audio files.csv 2114002 --auto-token
```

**Windows:**
```powershell
.\rcx-audio.ps1 upload C:\audio files.csv 2114002 -AutoToken
```

---

## Expected Output

```
🔑 Fetching token via get_token.sh...
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

**Token expiry** — tokens expire after 1 hour. For large batches, use `--auto-token` / `-AutoToken` to ensure a fresh token is fetched at the start of every run.

---

## Troubleshooting

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `Failed to get RingCentral token` | Wrong credentials or expired JWT | Check `.env` values; regenerate JWT from RingCentral Developer Console |
| `Failed to get RingCX token` | Account lacks RingCX access | Verify sub-account has RingCX provisioned |
| `401 Unauthorized` | Token expired | Re-run with `--auto-token` / `-AutoToken` or paste a fresh token |
| `404 Not Found` | Wrong account ID | Verify the sub-account ID parameter |
| `400 Bad Request` | Filename mismatch or missing file | Check CSV filenames match files in the working directory exactly (case-sensitive on Mac/Linux) |
| Token prints as `null` | JWT expired | Generate a new JWT from RingCentral Developer Console |
| `running scripts is disabled` (Windows) | Execution policy blocked | Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
