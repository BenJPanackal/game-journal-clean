import { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, KeyRound, User, CheckCircle, ImagePlus } from 'lucide-react';
import { patchProfile, type AppProfile } from '../api/profile';

const TWITCH_DEV_APPS = 'https://dev.twitch.tv/console/apps';
const TWITCH_REGISTER = 'https://www.twitch.tv/signup';
const IGDB_API_PRODUCT = 'https://api.igdb.com/';

type Props = {
  open: boolean;
  initialProfile: AppProfile | null;
  /** First-time flow: backdrop / X cannot dismiss without Skip or Save. */
  blocking?: boolean;
  /** Show “Skip — library only” when IGDB is not yet configured. */
  allowSkip?: boolean;
  onClose: () => void;
  onSaved: (p: AppProfile) => void;
};

export default function ProfileSetupModal({
  open,
  initialProfile,
  blocking = false,
  allowSkip = true,
  onClose,
  onSaved,
}: Props) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [llmProvider, setLlmProvider] = useState('none');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://127.0.0.1:11434');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    const done = initialProfile?.onboardingComplete;
    setDisplayName(initialProfile?.displayName ?? '');
    setProfileImageUrl(initialProfile?.profileImageUrl ?? '');
    setLlmProvider(initialProfile?.llmProvider ?? 'none');
    setOllamaBaseUrl(initialProfile?.ollamaBaseUrl ?? 'http://127.0.0.1:11434');
    setClientId('');
    setClientSecret('');
    setStep(done ? 2 : 0);
  }, [open, initialProfile]);

  if (!open) return null;

  const goSkip = async () => {
    setBusy(true);
    setErr(null);
    try {
      const p = await patchProfile({ onboardingComplete: true });
      onSaved(p);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const goSaveAll = async () => {
    setBusy(true);
    setErr(null);
    try {
      const a = clientId.trim();
      const b = clientSecret.trim();
      if ((a && !b) || (!a && b)) {
        setErr('Provide both Client ID and Secret, or leave both blank.');
        setBusy(false);
        return;
      }
      if (!initialProfile?.onboardingComplete && (!a || !b)) {
        setErr('Client ID and Secret are required to enable IGDB search.');
        setBusy(false);
        return;
      }
      const patch: Parameters<typeof patchProfile>[0] = {
        displayName: displayName.trim() || null,
        profileImageUrl: profileImageUrl.trim() || null,
        onboardingComplete: true,
        llmProvider,
        ollamaBaseUrl: ollamaBaseUrl.trim() || 'http://127.0.0.1:11434',
      };
      if (a && b) {
        patch.twitchClientId = a;
        patch.twitchClientSecret = b;
      }
      const p = await patchProfile(patch);
      onSaved(p);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const goSaveProfileOnly = async () => {
    setBusy(true);
    setErr(null);
    try {
      const p = await patchProfile({
        displayName: displayName.trim() || null,
        profileImageUrl: profileImageUrl.trim() || null,
        llmProvider,
        ollamaBaseUrl: ollamaBaseUrl.trim() || 'http://127.0.0.1:11434',
      });
      onSaved(p);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const onPickImage = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 512 * 1024) {
      setErr('Image must be 512KB or smaller');
      return;
    }
    setErr(null);
    const r = new FileReader();
    r.onload = () => {
      const url = typeof r.result === 'string' ? r.result : '';
      setProfileImageUrl(url);
    };
    r.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      {blocking ? (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden />
      ) : (
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className="relative w-full max-w-lg journal-card vhs-glow z-depth-4 rounded-xl border border-primary/30 p-6 space-y-4"
        role="dialog"
        aria-labelledby="profile-setup-title"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="profile-setup-title" className="text-lg font-semibold text-primary readable-accent">
            {initialProfile?.onboardingComplete ? 'Profile & Twitch keys' : 'Welcome — connect IGDB'}
          </h2>
          <button
            type="button"
            onClick={() => (blocking ? void goSkip() : onClose())}
            className="p-1 rounded-lg hover:bg-muted/60 fast-transition"
            aria-label={blocking ? 'Skip setup' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          This app uses your own <strong className="text-foreground">Twitch Developer</strong> app (free) so
          IGDB search runs under your quota. That is separate from a Twitch <em>viewer</em> account — but you
          need a Twitch account to register on the developer console.
        </p>

        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Steps:</p>
            <ol className="text-sm space-y-2 list-decimal pl-5 text-muted-foreground">
              <li>
                Create a Twitch account if you don’t have one:{' '}
                <a
                  href={TWITCH_REGISTER}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-0.5 hover:underline"
                >
                  twitch.tv/signup <ExternalLink className="w-3 h-3 inline" />
                </a>
              </li>
              <li>
                Open{' '}
                <a
                  href={TWITCH_DEV_APPS}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-0.5 hover:underline"
                >
                  Twitch Developer Console <ExternalLink className="w-3 h-3 inline" />
                </a>{' '}
                → <strong className="text-foreground">Register Your Application</strong>.
              </li>
              <li>
                Add the <strong className="text-foreground">IGDB</strong> API product to the app (
                <a href={IGDB_API_PRODUCT} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  api.igdb.com
                </a>
                ).
              </li>
              <li>Copy the <strong className="text-foreground">Client ID</strong> and generate a Client Secret.</li>
            </ol>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-2 rounded-lg bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 fast-transition"
            >
              I have my Client ID &amp; Secret
            </button>
            {allowSkip && (
              <button
                type="button"
                onClick={() => void goSkip()}
                disabled={busy}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground fast-transition"
              >
                Skip — use journal without IGDB search
              </button>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-secondary">
              <KeyRound className="w-4 h-4" />
              Twitch Developer credentials
            </div>
            <label className="block text-xs text-muted-foreground">
              Client ID
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full px-3 py-2 rounded-md bg-input/50 border border-border text-sm readable-text"
                placeholder="From dev.twitch.tv console"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Client Secret
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full px-3 py-2 rounded-md bg-input/50 border border-border text-sm readable-text"
                placeholder="Never shared outside this device"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-muted/40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!clientId.trim() || !clientSecret.trim()}
                className="flex-1 py-2 rounded-lg bg-secondary/20 border border-secondary/50 text-secondary disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-accent">
              <User className="w-4 h-4" />
              Your profile (optional)
            </div>
            <label className="block text-xs text-muted-foreground">
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md bg-input/50 border border-border text-sm readable-text"
                placeholder="How you want to appear in the app"
              />
            </label>
            <div className="block text-xs text-muted-foreground">
              <span className="block mb-2">Profile picture (max 512KB)</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => profileImageInputRef.current?.click()}
                  className="group relative flex-shrink-0 w-20 h-20 rounded-full border-2 border-dashed border-primary/45 bg-input/40 flex items-center justify-center hover:border-primary/70 hover:bg-primary/10 fast-transition overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label="Upload profile picture"
                >
                  {profileImageUrl ? (
                    <>
                      <img
                        src={profileImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 fast-transition">
                        <ImagePlus className="w-7 h-7 text-white" aria-hidden />
                      </span>
                    </>
                  ) : (
                    <ImagePlus className="w-9 h-9 text-primary/80 group-hover:text-primary" aria-hidden />
                  )}
                </button>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm text-foreground">Upload profile photo</p>
                  <p className="text-[11px] leading-relaxed">
                    Click the circle to choose an image (PNG, JPG, etc.)
                  </p>
                  {profileImageUrl ? (
                    <button
                      type="button"
                      onClick={() => setProfileImageUrl('')}
                      className="text-[11px] text-destructive hover:underline fast-transition"
                    >
                      Remove photo
                    </button>
                  ) : null}
                </div>
                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    onPickImage(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {initialProfile?.onboardingComplete && (
              <div className="pt-2 border-t border-border/50 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Replace Twitch credentials (leave blank to keep current keys on this device):
                </p>
                <input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-md bg-input/50 border border-border text-sm readable-text"
                  placeholder="New Client ID (optional)"
                />
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-md bg-input/50 border border-border text-sm readable-text"
                  placeholder="New Client Secret (optional)"
                />
              </div>
            )}

            <div className="pt-2 border-t border-border/50 space-y-2">
              <p className="text-xs text-muted-foreground">Game guide AI (optional — wiki answers work without this)</p>
              <label className="block text-xs text-muted-foreground">
                LLM provider
                <select
                  value={llmProvider}
                  onChange={(e) => setLlmProvider(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md bg-input/50 border border-border text-sm readable-text"
                >
                  <option value="none">None — wiki facts only</option>
                  <option value="ollama">Ollama (local, free)</option>
                </select>
              </label>
              {llmProvider === 'ollama' && (
                <label className="block text-xs text-muted-foreground">
                  Ollama URL
                  <input
                    value={ollamaBaseUrl}
                    onChange={(e) => setOllamaBaseUrl(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-md bg-input/50 border border-border text-sm readable-text"
                    placeholder="http://127.0.0.1:11434"
                  />
                </label>
              )}
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                Install Ollama and pull a model (e.g. <code className="text-foreground">llama3.2:3b</code>) to
                optionally rephrase wiki excerpts on the journal guide panel.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(initialProfile?.onboardingComplete ? 0 : 1)}
                className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-muted/40"
              >
                {initialProfile?.onboardingComplete ? 'Full setup guide' : 'Back'}
              </button>
              <button
                type="button"
                onClick={() =>
                  void (initialProfile?.onboardingComplete && !clientId.trim() && !clientSecret.trim()
                    ? goSaveProfileOnly()
                    : goSaveAll())
                }
                disabled={busy}
                className="flex-1 py-2 rounded-lg bg-primary/25 border border-primary/50 text-primary inline-flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                {initialProfile?.onboardingComplete ? 'Save' : 'Save & finish'}
              </button>
            </div>
          </div>
        )}

        {err && (
          <p className="text-sm text-destructive" role="alert">
            {err}
          </p>
        )}

        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          <strong className="text-muted-foreground">Cross-device login</strong> is not in this build — credentials
          stay in your local database on this machine. A future version can add sign-in to sync keys and profile
          securely.
        </p>
      </div>
    </div>
  );
}
