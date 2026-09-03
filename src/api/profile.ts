const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export type AppProfile = {
  displayName: string | null;
  profileImageUrl: string | null;
  hasTwitchCredentials: boolean;
  onboardingComplete: boolean;
  credentialSource: 'database' | 'environment' | 'none';
  llmProvider: string;
  hasLlmConfigured: boolean;
  ollamaBaseUrl: string;
};

export async function fetchProfile(): Promise<AppProfile> {
  const res = await fetch('/api/profile');
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json() as Promise<AppProfile>;
}

export type PatchProfileBody = {
  displayName?: string | null;
  profileImageUrl?: string | null;
  twitchClientId?: string | null;
  twitchClientSecret?: string | null;
  onboardingComplete?: boolean;
  llmProvider?: string;
  llmApiKey?: string | null;
  ollamaBaseUrl?: string | null;
};

export async function patchProfile(body: PatchProfileBody): Promise<AppProfile> {
  const res = await fetch('/api/profile', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const msg = typeof j?.error === 'string' ? j.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AppProfile>;
}
