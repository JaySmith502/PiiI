/**
 * Public URLs for PiiI.
 *
 * These are shown to users in three places that must never disagree: the
 * extension's `homepage_url` in the manifest, the links on the onboarding page,
 * and the Chrome Web Store listing.
 *
 * The published pages live in the public docs repository:
 *   https://github.com/JaySmith502/PiiI-public
 *
 * `privacy.html` there is generated from this repository's `PRIVACY.md` by
 * `scripts/build-public-site.mjs`, which is what stops the published policy from
 * drifting out of sync with the text the extension actually ships with.
 *
 * Because these values are baked into a shipped artifact, the public page must
 * exist *before* a release that points at it — changing a value here changes
 * where every installed user is sent.
 */
export const PUBLIC_SITE_URL = 'https://jaysmith502.github.io/PiiI-public/'

/** Rendered from PRIVACY.md. Never edit the published copy by hand. */
export const PUBLIC_PRIVACY_URL = `${PUBLIC_SITE_URL}privacy.html`

/** GitHub-rendered markdown in the public docs repository. */
export const PUBLIC_SUPPORT_URL = 'https://github.com/JaySmith502/PiiI-public/issues'

/** Direct "new issue" form, for in-product "Report a problem" links. */
export const PUBLIC_NEW_ISSUE_URL = `${PUBLIC_SUPPORT_URL}/new`

/** The supported-site list quoted in the store listing description. */
export const PUBLIC_SITES_URL = 'https://github.com/JaySmith502/PiiI-public/blob/main/SITES.md'
