import { basename, join } from "node:path";
import type { AudioRow } from "./types";
import { getToken, promptToken } from "./auth";
import { requireText, parseCsv } from "./utils";

const defaultApiBase = "https://ringcx.ringcentral.com";

export function accountAudioUrl(account: string): string {
  const apiBase = Bun.env.RCX_API_BASE_URL ?? defaultApiBase;
  return `${apiBase}/cx/admin/v1/accounts/~/sub-accounts/${encodeURIComponent(account)}/accountaudio`;
}

export async function uploadFile(url: string, token: string, account: string, row: AudioRow, filePath: string): Promise<{ status: number; body: string }> {
  const form = new FormData();
  form.append("accountId", account);
  form.append("audioName", row.audioName);
  form.append("locale", row.locale);
  form.append("file", new File([await Bun.file(filePath).arrayBuffer()], basename(row.file), { type: "audio/wav" }));

  try {
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, body: form });
    return { status: response.status, body: await response.text() };
  } catch (error) {
    return { status: 0, body: error instanceof Error ? error.message : String(error) };
  }
}

export async function upload(workingDirectory: string, csvFile: string, account: string, autoToken: boolean): Promise<void> {
  const refreshToken = async () => autoToken ? getToken() : promptToken();
  let token = await refreshToken();
  const url = accountAudioUrl(account);

  console.log("🔍 Validating token...");
  const validation = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }).catch(() => ({ status: 0 }));
  if (validation.status === 401 || validation.status === 0) token = await refreshToken();

  for (const row of parseCsv(await requireText(csvFile))) {
    const filePath = join(workingDirectory, row.file);
    if (!Bun.file(filePath).size) {
      console.log(`❌ ${row.audioName} (${row.locale}) - file not found: ${filePath}`);
      continue;
    }

    let result = await uploadFile(url, token, account, row, filePath);
    if (result.status === 401 || result.status === 0) {
      console.log(`⚠️  ${row.audioName} (${row.locale}) — ${result.status} received, refreshing token and retrying...`);
      token = await refreshToken();
      result = await uploadFile(url, token, account, row, filePath);
    }
    if (result.status === 201) console.log(`✅ ${row.audioName} (${row.locale}) — uploaded`);
    else console.log(`❌ ${row.audioName} (${row.locale}) — failed (${result.status}): ${result.body}`);
  }
}
