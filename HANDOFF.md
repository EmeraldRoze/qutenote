# QuteNote — Handoff / Status Board
Written: 2026-10-06 (replaces stale April 10 handoff)

## Where things stand
**QuteNote is now an iOS app.** First TestFlight build (1.0 build 1) uploaded to App Store Connect on Oct 6. Watcher script is waiting for Apple processing, then submits beta review and creates the public TestFlight link.

## What shipped Oct 6 (all committed + deployed)
- Capacitor wrapper (apps/web/ios), app ID club.cutenote.app, runs in simulator
- Native app opens straight to sign-in (website keeps landing page), safe-area/status bar handled, mobile nav decluttered
- Sign in with Apple: native button → POST /auth/apple (jose JWKS verify) → appleId on User
- Google sign-in in app: system browser + qutenote:// deep link back (Google blocks webview OAuth)
- Emerald's stamp icon + cream launch screen
- Live DB updated: appleId column + Invite tables (Invite tables were missing since May — invite feature was silently broken in prod, now repaired)
- API deployed to DO: ACTIVE, /auth/apple verified live on cutenote.club

## Apple account facts (QuteNote)
- ASC App ID 6819877820, bundle club.cutenote.app (bundleId resource 58AWMG6XQZ), SKU qutenote-001
- Sign in with Apple capability enabled on bundle ID (PRIMARY_APP_CONSENT)
- Provisioning profile "QuteNote AppStore" installed on this Mac (cert "Apple Distribution: Emam Cohen", NVA7KZQ4G5)
- Same ASC API key as Dreambound: Y5NXGFNCFV (~/.appstoreconnect/private_keys/), issuer a8f9ba85-917d-49e9-888e-e128d4ef6822, team 97276PB95S; key cannot do cloud signing → manual signing export
- scripts/ios/ in repo: asc.js (ASC API helper), exportOptions.plist, qutenote_testflight.js (processing watcher + beta review + public link)

## Build/upload pipeline (per new build)
1. Bump CURRENT_PROJECT_VERSION in apps/web/ios/App/App.xcodeproj (both Debug + Release) — EVERY upload
2. cd apps/web && VITE_API_BASE=https://qutenote.com/api npm run build && npx cap sync ios
3. xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphoneos -destination 'generic/platform=iOS' -archivePath <path>.xcarchive CODE_SIGNING_ALLOWED=NO archive
4. xcodebuild -exportArchive -archivePath <path>.xcarchive -exportOptionsPlist scripts/ios/exportOptions.plist -exportPath <dir> -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_Y5NXGFNCFV.p8 -authenticationKeyID Y5NXGFNCFV -authenticationKeyIssuerID a8f9ba85-917d-49e9-888e-e128d4ef6822

## TestFlight status (Oct 11-12): BUILD 16 APPROVED — current
Build 1.0(16): full design update from qutenote-screens.zip -- Welcome, Home, QTs, Profile, Settings (new), Send all rebuilt to match. New card catalog (lib/cards.ts) replaces Round D's 5 fictional artists with @ellis_tolsma (real) + 4 placeholders. Settings route /settings + /settings/account new. Push-failure-reason fix included (surfaces real error instead of generic message).
Still pending: Emerald's device has never registered a push token -- "Turn on reminders" tap needed to run the live test (check DeviceToken table, fire sendPush from scripts if it lands).

## Earlier (Oct 9): BUILD 15 APPROVED
Build 1.0(15): Round D — 5-artist card gallery, real photo uploads (Upload table on prod; photos stored in Postgres, served at /api/uploads/:id, Lob fetches card fronts there), side-by-side tap-to-edit preview, personalized invite links (/i/username-xxxx), logout on profile, annual checkbox on dates, date-save fix, invite buttons on Home. Server card catalog lives in submitNote.ts — keep in sync with apps/web/src/lib/cards.ts.
Still pending: Emerald taps "Turn on reminders" (build 14+) -> live test push fires automatically (6h watcher running).

## Earlier (Oct 9): BUILD 14 APPROVED
Build 1.0(14): push registration fix — AppDelegate.swift was missing the two APNs token-forwarding methods, so "Turn on reminders" silently did nothing. Also reminder button now shows working/denied/failed states.

## Earlier (Oct 9): BUILD 13 APPROVED
Build 1.0(13): full nav-bar emoji set (house, bff, calendar, blush) + og-image-v2.png link preview.
Still pending from C1: Emerald taps "Turn on reminders" -> fire live test push.

## Earlier (Oct 9): BUILD 12 APPROVED
Build 1.0(12): BFF bunny-ears emoji on QTs tab + page title. Tiny round, shipped same day.
Still pending from C1: Emerald taps "Turn on reminders" on her phone -> fire live test push.

## Earlier (Oct 9): BUILD 11 APPROVED
Build 1.0(11): C1 — push reminders (APNs key CXSX9P9S8Z via APNS_KEY_BASE64 on DO api; PUSH capability added to bundle ID; profile REGENERATED uuid fa8c65e5) + 2-hour edit window (scheduler submits PENDING notes; PATCH /notes/:id). DeviceToken table live. Scheduler confirmed running in prod logs. Lockfile gotcha: npm installs touch ROOT package-lock.json — always commit it. Pending: Emerald enables reminders on build 11 -> fire live test push (query DeviceToken on prod, sendPush locally with ~/.appstoreconnect key).

## Earlier (Oct 9): BUILD 10 APPROVED
Build 1.0(10): lime postmark-heart app icon (Emerald's pick; Apple's corner mask covers the art's baked corners). Everything from builds 8-9 included.

## Earlier (Oct 9): BUILD 9 APPROVED
Build 1.0(9): onboarding flow, all 21 TestFlight feedback fixes (fetched via ASC betaFeedbackScreenshotSubmissions — reusable pattern), new stamp app icon, emoji avatars, sms:-composer invites, no-zoom app feel. Deployed to web, link-mode invites verified live. Round C candidates: push notifications (real reminders), handwriting studio, group cards, recipient claim flow, 2-hour edit window.

## Earlier (Oct 9): BUILD 8 APPROVED
Build 1.0(8): App Screens Round A (Profile w/ membership+stamp book+postcards, Your QTs, Invite w/ real referral credit). Web+API deployed. Round B queued: onboarding 0-4, handwriting 15-17, group cards 18-20, claim flow 21-25, send-flow board refinements.

## Earlier (Oct 9): BUILD 7 APPROVED
Build 1.0(7): new Home (Happenings statuses, lime nudge, hearts feed, tab bar w/ SEND stamp) + 3-step send flow. Status/Heart tables live on prod DB (additive, verified). API deployed, /statuses endpoints verified live (demo account posted a test status). Build 7 APPROVED same hour. Old send-flow Step files (StepOccasion/StepFont/StepWrite/StepCard/StepReview) now unused — deleting needs FIREFLY. Next product rounds from guide: 2-hour edit window, stamp book, handwriting capture, group cards, onboarding.

## Earlier (Oct 9): BUILD 6 APPROVED
Build 1.0(6): the full new design system (Design Guide Oct 2026) live in app + website. Awaiting Emerald's screen-by-screen review. Next rounds: unbuilt guide features (status rows, stamp book, handwriting capture, group cards, 5-tab bar, countdown nudges, onboarding).

## Earlier (Oct 9): BUILD 5 APPROVED
Build 1.0(5): ligatures disabled globally — the bundled Recoleta-Regular.otf is a Latinotype TRIAL file whose fi/fl ligature glyphs are watermark boxes. OPEN ITEM: license real Recoleta (or swap font) before public launch — Emerald deciding. Also live: landing page with Emerald's full copy + app fonts; Google in-app sign-in now returns via "Open QuteNote" button page (awaiting her retest confirmation).

## Earlier (Oct 9): BUILD 4 APPROVED
Build 1.0(4) approved: watercolor wordmark + torn-paper emoji art (QEmoji component). Website deployed with the same. Awaiting Emerald's visual check of emoji sizing in the send flow, and her full redesign screens in design/redesign-oct-2026.

## Earlier (Oct 8 evening): BUILD 3 APPROVED
Build 1.0(3) approved Oct 8: app points at qutenote.com everywhere (Emerald spotted cutenote.club in the sign-in flow of build 2). Testers auto-update via TestFlight. Pending decision from Emerald: Cloudflare redirect cutenote.club -> qutenote.com (needs FIREFLY).

## Earlier (Oct 8): BUILD 2 APPROVED — PUBLIC LINK LIVE
Build 1.0(2) approved in beta review Oct 8. https://testflight.apple.com/join/BRW6MMEJ is live (cap 100 testers). Emerald notified; Round 1 feedback collection begins once she installs. Demo-account fix was evidently the right diagnosis.

## History (Oct 7)
- Build 1.0(1) was REJECTED in beta review (most likely cause: no demo account for the sign-in wall; exact reason unread — ASC web session expired before Resolution Center could be checked)
- Fix applied: demo account applereview@cutenote.club / QuteDemo2026! created on live app and attached to betaAppReviewDetail (demoAccountRequired true, note explains physical-goods Stripe exemption 3.1.3(e))
- Apple refuses resubmission of a rejected build (422 BUILD_STATE_NOT_INTERNAL_TESTING) → build 1.0(2) uploaded Oct 7; watcher adds it to the group + submits review when processing finishes
- Public Beta group afef6516-eef8-413d-b7c3-8103aba2b473, PUBLIC LINK: https://testflight.apple.com/join/BRW6MMEJ (activates on approval)
- Beta app description + feedback email set; review contact copied from Dreambound
- If build 2 is also rejected: Emerald must sign into appstoreconnect.apple.com so the Resolution Center message can be read — do that BEFORE further guessing

## Domain consolidation (Oct 8, FIREFLY) — status
- Stripe webhook repointed to https://qutenote.com/stripe/webhook (verified 400-on-unsigned, enabled)
- GitHub repo renamed EmeraldRoze/cutenote -> EmeraldRoze/qutenote (via gh CLI; .env GITHUB_TOKEN cannot admin). DO spec repointed (2 components), deploy from renamed repo VERIFIED ACTIVE. Local remote updated
- DONE Oct 8: cutenote.club -> qutenote.com 301 redirect live (Cloudflare single redirect rule "Forward everything to qutenote.com" on zone 66b0f84e..., created via dashboard with Emerald logged in; API token is DNS-only). Verified: apex + www redirect with path/query preserved, qutenote.com healthy. Domain consolidation COMPLETE.
- CORS keeps both domains during transition (fine). Google OAuth prod redirect already qutenote.com

## Design system (Oct 9) — CURRENT DIRECTION
Source of truth: ~/Downloads/QuteNote iOS Design Guide.docx (extracted text in scripts/ios/../design notes; re-extract if needed). Tokens live in apps/web/src/index.css with legacy var aliases. Landing has its own :root block, same values. Guide's unbuilt features listed in MEMORY.md. Emerald's settle-items: QTs chosen (not Quties), $7.95 kept, pen options untouched.

## Next steps
1. Confirm beta review approved; link goes live automatically — tell Emerald
2. Round 1 on her phone: Apple sign-in and Google sign-in are UNPROVEN on real device — test first
3. Collect ALL feedback before fixing (round protocol); then remaining Phase 5 web work (CN Score, badges, connection birthdays)

## Watch out for
- ~/Documents is iCloud-synced with optimize-storage: after idle months files get evicted → ETIMEDOUT reads. Fix: brctl download <folder>
- Web deploys: DO builds from REPO ROOT; TypeScript strict; prisma generate before tsc (see MEMORY.md "learned the hard way")
- Native build bakes VITE_API_BASE at build time — always set it for iOS builds or API calls hit capacitor://localhost/api and fail
- google-auth.ts hardcodes production API_URL to https://qutenote.com/api (Google OAuth redirect URI) — do not change without updating Google console
