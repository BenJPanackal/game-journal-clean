import axios from 'axios';

const SYSTEM_PROMPT = `You are a game guide assistant. Answer using ONLY the wiki excerpts provided.
Rules:
- If the excerpts do not contain the answer, say "Not found in the wiki sources provided."
- For locations, drops, stats, and quest steps, quote or paraphrase closely — do not invent.
- Never merge lore themes with drop locations (e.g. do not confuse a boss area with an unrelated region).
- End with a short line: Sources: [Wiki] only.`;

const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

/**
 * @param {{ provider: string, apiKey: string, ollamaBaseUrl: string, question: string, sections: { title: string, body: string }[] }}
 */
export async function rephraseWithLlm({ provider, apiKey, ollamaBaseUrl, question, sections }) {
  const context = sections.map((s) => `### ${s.title}\n${s.body}`).join('\n\n').slice(0, 7000);
  const userContent = `QUESTION: ${question}\n\nWIKI EXCERPTS:\n${context}`;

  if (provider === 'ollama') {
    const res = await axios.post(
      `${ollamaBaseUrl}/api/chat`,
      {
        model: DEFAULT_OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
      },
      { timeout: 120000, validateStatus: () => true }
    );
    if (res.status !== 200) {
      const detail = res.data?.error || res.statusText || `HTTP ${res.status}`;
      throw new Error(`Ollama error: ${detail}`);
    }
    const text = res.data?.message?.content;
    if (!text) throw new Error('Ollama returned an empty response');
    return String(text).trim();
  }

  throw new Error(`LLM provider "${provider}" is not supported yet`);
}
