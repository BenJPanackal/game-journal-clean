/** Read guide LLM settings from app_profile + optional .env fallbacks. */

/** @param {import('better-sqlite3').Database} db */
export function getLlmSettings(db) {
  const row = db.prepare(`SELECT llm_provider, llm_api_key, ollama_base_url FROM app_profile WHERE singleton = 1`).get();
  const provider = String(row?.llm_provider || process.env.LLM_PROVIDER || 'none').toLowerCase();
  const apiKey = (row?.llm_api_key ?? process.env.GEMINI_API_KEY ?? process.env.OPENAI_API_KEY ?? '').trim();
  const ollamaBaseUrl = (
    row?.ollama_base_url ??
    process.env.OLLAMA_BASE_URL ??
    'http://127.0.0.1:11434'
  )
    .toString()
    .trim()
    .replace(/\/$/, '');

  return { provider, apiKey, ollamaBaseUrl };
}

/** @param {import('better-sqlite3').Database} db */
export function hasGuideLlm(db) {
  const { provider, apiKey } = getLlmSettings(db);
  if (provider === 'ollama') return true;
  if (provider === 'gemini' || provider === 'openai') return Boolean(apiKey);
  return false;
}

/** @param {import('better-sqlite3').Database} db */
export function llmSettingsForClient(db) {
  const { provider, ollamaBaseUrl } = getLlmSettings(db);
  return {
    llmProvider: provider,
    hasLlmConfigured: hasGuideLlm(db),
    ollamaBaseUrl,
  };
}
