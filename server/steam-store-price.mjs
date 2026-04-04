// server/steam-store-price.mjs — live Steam USD/EUR etc. from Valve’s public appdetails API
// (only runs when IGDB external_games provides a Steam app id — not a substitute for IGDB pricing, which does not exist.)
import axios from 'axios';

/**
 * @param {number} steamAppId
 * @returns {Promise<{
 *   currency: string;
 *   final: number;
 *   initial: number;
 *   discountPercent: number;
 *   finalFormatted: string;
 *   initialFormatted: string;
 * } | null>}
 */
export async function fetchSteamStorePriceOverview(steamAppId) {
  if (!Number.isInteger(steamAppId) || steamAppId <= 0) return null;
  try {
    const res = await axios.get('https://store.steampowered.com/api/appdetails', {
      params: {
        appids: steamAppId,
        filters: 'price_overview',
        cc: 'us',
        l: 'en',
      },
      timeout: 6000,
      headers: {
        'User-Agent': 'GameJournal/1.0 (+https://github.com) node',
        Accept: 'application/json',
      },
      validateStatus: (s) => s < 500,
    });
    const node = res.data?.[String(steamAppId)];
    if (!node?.success || !node.data?.price_overview) return null;
    const po = node.data.price_overview;
    return {
      currency: String(po.currency || 'USD'),
      final: Number(po.final) / 100,
      initial: Number(po.initial) / 100,
      discountPercent: Number(po.discount_percent) || 0,
      finalFormatted: String(po.final_formatted || ''),
      initialFormatted: String(po.initial_formatted || ''),
    };
  } catch {
    return null;
  }
}
