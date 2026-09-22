const DEFAULT_UTM = {
  utm_source: 'amazonhomes',
  utm_medium: 'referral',
  utm_campaign: 'site',
}

/**
 * Append UTM tracking params to an outbound (external http/https) URL.
 * Same-origin, relative, mailto, and tel links are returned unchanged.
 */
export function withUtm(
  url: string,
  overrides: Partial<typeof DEFAULT_UTM> = {},
): string {
  if (!/^https?:\/\//i.test(url)) return url
  try {
    const parsed = new URL(url)
    if (
      typeof window !== 'undefined' &&
      parsed.origin === window.location.origin
    ) {
      return url
    }
    const params = { ...DEFAULT_UTM, ...overrides }
    for (const [key, value] of Object.entries(params)) {
      if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value)
    }
    return parsed.toString()
  } catch {
    return url
  }
}
