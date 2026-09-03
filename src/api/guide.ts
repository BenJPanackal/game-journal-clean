const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export type GuideCitationTier = 'official' | 'wiki' | 'community';

export type GuideCitation = {
  tier: GuideCitationTier;
  title: string;
  url: string;
  excerpt: string;
};

export type GuideAskResponse = {
  answer: string;
  citations: GuideCitation[];
  disclaimer: string | null;
  mode: 'facts' | 'llm';
  wikiBaseUrl?: string;
  pageTitle?: string;
  pageUrl?: string;
  cached?: boolean;
};

export type GuideStatus = {
  llmProvider: string;
  hasLlmConfigured: boolean;
  ollamaBaseUrl: string;
};

export async function fetchGuideStatus(): Promise<GuideStatus> {
  const res = await fetch('/api/guide/status');
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json() as Promise<GuideStatus>;
}

export type GuideAskBody = {
  gameId: number;
  question: string;
  includeCommunity?: boolean;
  useLlm?: boolean;
};

export async function askGameGuide(body: GuideAskBody): Promise<GuideAskResponse> {
  const res = await fetch('/api/guide/ask', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof j?.message === 'string'
        ? j.message
        : typeof j?.error === 'string'
          ? j.error
          : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return j as GuideAskResponse;
}
