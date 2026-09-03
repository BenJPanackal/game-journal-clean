import axios from 'axios';

/** Turn a natural question into a Fextralife path slug guess. */
export function guessFextralifeSlug(question) {
  let q = question
    .replace(/\?/g, '')
    .replace(/where (is|do i find|to find)|how (do i|to) get|what is|tell me about/gi, ' ')
    .trim();
  if (!q) return null;
  return q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('+');
}

/**
 * @param {string} wikiBase e.g. https://eldenring.wiki.fextralife.com
 * @param {string} slug e.g. Rivers+of+Blood
 */
export async function fetchFextralifePage(wikiBase, slug) {
  const base = wikiBase.replace(/\/$/, '');
  const url = `${base}/${slug}`;
  const res = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'GameJournal/1.0 guide-fetch',
      Accept: 'text/html',
    },
    validateStatus: (s) => s < 500,
  });
  if (res.status !== 200 || typeof res.data !== 'string') return null;
  const titleMatch = res.data.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s*-\s*Elden Ring Wiki.*$/i, '').trim() : slug.replace(/\+/g, ' ');
  return { title, html: res.data, pageUrl: url };
}
