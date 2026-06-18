// server/settings-routes.mjs — local profile + Twitch developer credentials (IGDB)
import { Router } from 'express';
import { credentialSource, getEnvTwitchCredentials, hasIgdbCredentials } from './twitch-credentials.mjs';

const MAX_PROFILE_IMAGE_CHARS = 450_000; // ~330KB base64 data URLs

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

/** @param {import('better-sqlite3').Database} db */
function getProfileRow(db) {
  return db.prepare(`SELECT * FROM app_profile WHERE singleton = 1`).get();
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ onCredentialsChanged?: () => void }} [hooks]
 */
export function createSettingsRouter(db, hooks = {}) {
  const r = Router();

  r.get('/profile', (req, res) => {
    try {
      const row = getProfileRow(db);
      const onboardingComplete = Number(row?.onboarding_complete) === 1;
      const hasCreds = hasIgdbCredentials(db);
      res.json({
        displayName: row?.display_name != null ? String(row.display_name).trim() || null : null,
        profileImageUrl: row?.profile_image_url != null ? String(row.profile_image_url) : null,
        hasTwitchCredentials: hasCreds,
        onboardingComplete,
        credentialSource: credentialSource(db),
      });
    } catch (e) {
      console.error('GET /api/profile', e);
      res.status(500).json({ error: 'Failed to load profile' });
    }
  });

  r.patch('/profile', (req, res) => {
    const body = req.body || {};
    const row = getProfileRow(db);
    if (!row) return res.status(500).json({ error: 'Profile row missing' });

    let displayName = row.display_name;
    if (Object.prototype.hasOwnProperty.call(body, 'displayName')) {
      const v = body.displayName;
      displayName = v == null || v === '' ? null : String(v).trim().slice(0, 120);
    }

    let profileImageUrl = row.profile_image_url;
    if (Object.prototype.hasOwnProperty.call(body, 'profileImageUrl')) {
      const v = body.profileImageUrl;
      if (v == null || v === '') {
        profileImageUrl = null;
      } else {
        const s = String(v);
        if (s.length > MAX_PROFILE_IMAGE_CHARS) {
          return badRequest(res, 'Profile image is too large (try a smaller file)');
        }
        profileImageUrl = s;
      }
    }

    let twitchClientId = row.twitch_client_id;
    let twitchClientSecret = row.twitch_client_secret;
    let credsChanged = false;

    if (Object.prototype.hasOwnProperty.call(body, 'twitchClientId')) {
      const v = body.twitchClientId;
      twitchClientId = v == null || v === '' ? null : String(v).trim();
      credsChanged = true;
      if (!twitchClientId) twitchClientSecret = null;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'twitchClientSecret')) {
      const v = body.twitchClientSecret;
      if (v != null && String(v).trim() !== '') {
        twitchClientSecret = String(v).trim();
        credsChanged = true;
      }
    }

    let onboardingComplete = Number(row.onboarding_complete) === 1;
    if (Object.prototype.hasOwnProperty.call(body, 'onboardingComplete')) {
      onboardingComplete = Boolean(body.onboardingComplete);
    }

    const nextId = twitchClientId ?? '';
    const nextSecret = twitchClientSecret ?? '';
    if (nextId && !nextSecret && !getEnvTwitchCredentials()) {
      return badRequest(res, 'Twitch Client Secret is required when Client ID is set (unless using .env)');
    }
    if (!nextId && nextSecret) {
      return badRequest(res, 'Twitch Client ID is required when setting a secret');
    }

    try {
      db.prepare(
        `UPDATE app_profile SET
          display_name = ?,
          profile_image_url = ?,
          twitch_client_id = ?,
          twitch_client_secret = ?,
          onboarding_complete = ?
        WHERE singleton = 1`
      ).run(
        displayName,
        profileImageUrl,
        twitchClientId,
        twitchClientSecret,
        onboardingComplete ? 1 : 0
      );

      if (credsChanged && typeof hooks.onCredentialsChanged === 'function') {
        hooks.onCredentialsChanged();
      }

      const updated = getProfileRow(db);
      res.json({
        displayName: updated.display_name != null ? String(updated.display_name).trim() || null : null,
        profileImageUrl: updated.profile_image_url != null ? String(updated.profile_image_url) : null,
        hasTwitchCredentials: hasIgdbCredentials(db),
        onboardingComplete: Number(updated.onboarding_complete) === 1,
        credentialSource: credentialSource(db),
      });
    } catch (e) {
      console.error('PATCH /api/profile', e);
      res.status(500).json({ error: 'Failed to save profile' });
    }
  });

  return r;
}
