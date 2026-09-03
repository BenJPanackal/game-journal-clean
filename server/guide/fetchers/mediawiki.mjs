import axios from 'axios';

/** @param {string} wikiBase e.g. https://eldenring.fandom.com */
export function mediaWikiApiUrl(wikiBase) {
  const base = wikiBase.replace(/\/$/, '');
  if (base.endsWith('/api.php')) return base;
  return `${base}/api.php`;
}

/**
 * @param {string} apiUrl
 * @param {string} searchTerm
 * @returns {Promise<{ title: string, pageUrl: string } | null>}
 */
export async function mediaWikiSearchPage(apiUrl, searchTerm) {
  const res = await axios.get(apiUrl, {
    params: {
      action: 'query',
      list: 'search',
      srsearch: searchTerm,
      format: 'json',
      origin: '*',
    },
    timeout: 12000,
    headers: { 'User-Agent': 'GameJournal/1.0 guide-fetch' },
  });
  const hit = res.data?.query?.search?.[0];
  if (!hit?.title) return null;
  const wikiOrigin = apiUrl.replace(/\/api\.php$/, '');
  const pageUrl = `${wikiOrigin}/wiki/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`;
  return { title: hit.title, pageUrl };
}

/**
 * @param {string} apiUrl
 * @param {string} pageTitle
 * @returns {Promise<{ title: string, html: string, pageUrl: string } | null>}
 */
export async function mediaWikiFetchPage(apiUrl, pageTitle) {
  const res = await axios.get(apiUrl, {
    params: {
      action: 'parse',
      page: pageTitle,
      prop: 'text',
      format: 'json',
      origin: '*',
    },
    timeout: 15000,
    headers: { 'User-Agent': 'GameJournal/1.0 guide-fetch' },
  });
  const parse = res.data?.parse;
  if (!parse?.text?.['*']) return null;
  const wikiOrigin = apiUrl.replace(/\/api\.php$/, '');
  const pageUrl = `${wikiOrigin}/wiki/${encodeURIComponent(String(parse.title).replace(/ /g, '_'))}`;
  return { title: parse.title, html: parse.text['*'], pageUrl };
}
