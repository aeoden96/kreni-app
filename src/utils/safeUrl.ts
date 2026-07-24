/**
 * Only http(s) URLs reach an `href` or `src`.
 *
 * Used for the remote link and image on a global announcement. That payload is
 * authored through a workflow input, so it is not a hostile source — but a
 * `javascript:` URL on an anchor would still be an XSS vector, and a mistyped
 * scheme is better dropped than rendered as a dead link or broken image.
 *
 * Relative URLs are resolved against the current document and kept, so an
 * in-app path stays usable.
 */
export function safeUrl(url: null | string | undefined): null | string {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}
