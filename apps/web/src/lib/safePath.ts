// Turning a real web address into something safe to record.
//
// Kept in its own file with NO imports on purpose: it is the one piece of the
// breadcrumb system that decides whether a person's name leaves the phone, so
// it has to be testable on its own. analytics.ts pulls in the API client,
// which only exists inside a browser build, and a privacy rule that cannot be
// run in a test is a privacy rule nobody checks.

// Paths that carry a person's handle. Recorded as the SHAPE of the screen,
// never the person: /profile/mayaok becomes /profile/:someone, which still
// answers "how often does anyone open a profile" and can no longer answer
// "who looked at Maya".
const PATH_RULES: Array<[RegExp, string]> = [
  [/^\/profile\/[^/]+/, '/profile/:someone'],
  [/^\/c\/[^/]+/, '/c/:card'],
  [/^\/thread\/[^/]+/, '/thread/:someone'],
  [/^\/artists\/[^/]+/, '/artists/:someone'],
]

export function safePath(path: string): string {
  try {
    // The query and hash come off BEFORE anything else, so no caller can leak
    // one by passing window.location.href or a router value that happens to
    // carry a search term someone typed or a recipient's first name.
    let p = String(path).split(/[?#]/)[0]
    for (const [re, replacement] of PATH_RULES) {
      if (re.test(p)) { p = p.replace(re, replacement); break }
    }
    return p.slice(0, 120)
  } catch {
    return ''
  }
}
