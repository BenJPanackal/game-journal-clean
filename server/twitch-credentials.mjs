// Resolve Twitch client-credentials for IGDB: stored profile overrides process.env.

/** @param {import('better-sqlite3').Database} db */
export function getEnvTwitchCredentials() {
  const clientId = (process.env.TWITCH_CLIENT_ID ?? '').trim();
  const clientSecret = (process.env.TWITCH_CLIENT_SECRET ?? '').trim();
  if (clientId && clientSecret) return { clientId, clientSecret };
  return null;
}

/** @param {import('better-sqlite3').Database} db */
export function getDbTwitchCredentials(db) {
  const row = db
    .prepare(
      `SELECT twitch_client_id AS id, twitch_client_secret AS secret FROM app_profile WHERE singleton = 1`
    )
    .get();
  const clientId = (row?.id ?? '').trim();
  const clientSecret = (row?.secret ?? '').trim();
  if (clientId && clientSecret) return { clientId, clientSecret };
  return null;
}

/** DB credentials take precedence over .env so in-app setup wins. */
export function resolveTwitchCredentials(db) {
  return getDbTwitchCredentials(db) || getEnvTwitchCredentials();
}

export function hasIgdbCredentials(db) {
  return resolveTwitchCredentials(db) != null;
}

export function credentialSource(db) {
  if (getDbTwitchCredentials(db)) return 'database';
  if (getEnvTwitchCredentials()) return 'environment';
  return 'none';
}
