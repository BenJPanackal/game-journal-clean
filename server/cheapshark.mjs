// server/cheapshark.mjs — optional retail / deal hints (third-party; best-effort)
import axios from 'axios';

function parseUsd(s) {
  const n = Number(String(s ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function normKey(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * @param {string} gameTitle
 * @returns {Promise<{
 *   matchedTitle: string;
 *   currentDealUsd: number | null;
 *   retailUsd: number | null;
 *   historicLowUsd: number | null;
 * } | null>}
 */
export async function fetchCheapSharkPricing(gameTitle) {
  const title = String(gameTitle ?? '').trim();
  if (!title) return null;

  try {
    const listRes = await axios.get('https://www.cheapshark.com/api/1.0/games', {
      params: { title },
      timeout: 4500,
      validateStatus: (s) => s < 500,
    });
    const list = Array.isArray(listRes.data) ? listRes.data : [];
    if (list.length === 0) return null;

    const target = normKey(title);
    let pick = list[0];
    let best = 0;
    for (const g of list) {
      const ext = normKey(g.external);
      const int = normKey(g.internalName);
      if (ext === target || int === target) {
        pick = g;
        best = 1000;
        break;
      }
      if (ext && (ext.includes(target) || target.includes(ext))) {
        const score = Math.min(ext.length, target.length);
        if (score > best) {
          best = score;
          pick = g;
        }
      }
    }

    const gameID = pick.gameID ?? pick.id;
    if (!gameID) return null;

    const detailRes = await axios.get('https://www.cheapshark.com/api/1.0/games', {
      params: { id: gameID },
      timeout: 4500,
      validateStatus: (s) => s < 500,
    });
    const d = detailRes.data;
    if (!d || typeof d !== 'object') return null;

    const deals = Array.isArray(d.deals) ? d.deals : [];
    let currentDealUsd = null;
    let retailUsd = null;
    for (const deal of deals) {
      const p = parseUsd(deal.price);
      const r = parseUsd(deal.retailPrice);
      if (p != null && (currentDealUsd == null || p < currentDealUsd)) currentDealUsd = p;
      if (r != null && (retailUsd == null || r > retailUsd)) retailUsd = r;
    }
    const listCheapest = parseUsd(pick.cheapest);
    if (currentDealUsd == null && listCheapest != null) currentDealUsd = listCheapest;

    const historicLowUsd = d.cheapestPriceEver?.price != null ? parseUsd(d.cheapestPriceEver.price) : null;

    return {
      matchedTitle: String(pick.external || pick.title || title),
      currentDealUsd,
      retailUsd,
      historicLowUsd,
    };
  } catch {
    return null;
  }
}
