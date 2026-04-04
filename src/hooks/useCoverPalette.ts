import { useEffect, useMemo, useState } from 'react';
import {
  type CoverPalette,
  fallbackCoverPalette,
  getCoverPalette,
} from '../lib/coverArtGradient';

/**
 * Title color, progress gradient, and track styling from cover art (with contrast clamps).
 * Falls back to theme primary/secondary if sampling fails (e.g. CORS).
 */
export function useCoverPalette(
  coverUrl: string,
  primary: string,
  secondary: string
): CoverPalette {
  const fb = useMemo(
    () => fallbackCoverPalette(primary, secondary),
    [primary, secondary]
  );
  const [fromCover, setFromCover] = useState<CoverPalette | null>(null);

  useEffect(() => {
    setFromCover(null);
    let cancelled = false;
    void getCoverPalette(coverUrl).then((p) => {
      if (!cancelled && p) setFromCover(p);
    });
    return () => {
      cancelled = true;
    };
  }, [coverUrl]);

  return fromCover ?? fb;
}
