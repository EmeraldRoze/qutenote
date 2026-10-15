# QuteNote — Handoff / Status Board
Written: 2026-10-06 (replaces stale April 10 handoff). Last updated: 2026-10-15.

## ROUND SHIPPED Oct 15 (evening) as BUILD 28 — APPROVED, LIVE WITH TESTERS (FIREFLY). The 4-item round:
1. Remove QT: on a friend's profile, "Your QT ✓" now has a Remove QT button (two-tap confirm) via existing DELETE /connections/:userId.
2. WEBSITE is info + launch-list only: Log in / Join buttons gone from landing nav + pricing card (replaced with "Get on the list" / inline capture forms); /login + /signup routes still EXIST unlinked (Google OAuth redirect + testers' direct links + invite claim flow all still work). REMINDER AT LAUNCH: add website login links back.
3. Email capture collects NAME + email (EarlySignup.name column added on prod; repeat signups backfill the name).
4. Launch list on /admin: table of signups + "Download spreadsheet" (CSV built client-side). Google Drive export on request via session tools.
Also: nav "Pricing" renamed "The deal" (last pricing mention). Allowance check for Emerald: all 18 members notesUsed=0; emerald + maya_k have allowance 5 (legacy), rest 2.

## REMINDER FOR NEXT ROUND (Emerald asked to be reminded)
- **Scheduling**: "Send now / Schedule it" on the preview step + "Scheduled cards" in Settings were held out of the Oct 15 redesign round on her call. Bring it up when the next round opens.
- Also still open: full-size artist card files from @ellis_tolsma and @bobbybealspresents before anything prints (current JPGs are Instagram-screenshot resolution); full-size stamp exports.

## FULL REDESIGN SHIPPED Oct 15 as BUILD 27 — APPROVED, LIVE WITH TESTERS (FIREFLY; design/redesign-oct15-2026, 18 screens)
- All 18 screens rebuilt to the design package (notebook paper w/ 36px ruling + title bands, new tab bar w/ sunglasses Profile + spec SEND stamp). Built by a 5-agent swarm (auth / home+QTs / send / dates / profile+settings), integrated, typecheck clean, visually QA'd via headless-Chrome phone emulation against prod data.
- FREE MODE: all pricing removed everywhere (app + website). No subscription needed to send; 2-cards/month allowance kept (gifted invite credits extend); allowance now resets on the 1st via scheduler (used to reset via Stripe invoices); Subscribe pages deleted; Stripe routes left dormant.
- PENS REPLACED: Caveat/Dancing/Reenie/Patrick retired -> Your handwriting/Fraunces(italic)/Sora/DM Mono/Rock Salt (lib/pens.ts, per-pen sizes 19/23/19/17/16). FontChoice enum migrated on prod. Old-pen notes deleted per Emerald (1 note total existed, backed up to backups/notes-backup-2026-10-15.json). notesUsed reset to 0 for all (2 members) for the free relaunch.
- New onboarding: email -> Create account -> Address -> Birthday(optional, skippable) -> Home; Apple/Google new users get Pick-your-handle (isNew flag plumbed through both auth flows; GET /users/handle-check). Old /onboarding/* pages deleted.
- New features: Home status box (always visible, POST), contacts sync (@capacitor-community/contacts; QTs matches contact emails via POST /users/match-contacts, Dates imports contact birthdays; native-only, NSContactsUsageDescription added), stamp collection (1 stamp per sent card, 4 designs cycling), delete account (DELETE /account, Apple-required), Add-a-date page with scroll wheels, 450-char note fix (API max was 300 while UI allowed 450).
- Artist catalog: @ellis_tolsma (real, featured) + @bobbybealspresents (real) + 3 placeholders ("Five artists" copy holds). Server copy in submitNote.ts synced.
- Watch out: send step 3 uses a contentEditable div (not textarea) for stamp text-wrap; QT remove is currently unreachable from QTs screen (rows open profiles now); reminders switch can't turn OFF server-side (no DELETE /devices); carousel colors follow the NEW design HTML (differs from Emerald's build-26 color-swap ask — flag if she comments).

## ROUND SHIPPED Oct 14 as BUILD 26 (FIREFLY, round closed by Emerald). All 9 Oct-13 feedback items addressed:
Home card colors swapped (invite=lime, alerts=neon-pink); status renamed "How's your heart?" everywhere; Happenings row removed from Home; handwriting prompts now name the letter in words (root cause of "did i twice": Unbounded's j looks exactly like i — HER SAVED j IS AN i, she should redraw j in the app); send flow Step 2 has a "Not on QuteNote yet?" invite-by-text box with her requested recipient copy; handwriting font compiler v2 (baseline snapping, size normalization per letter class, real descenders, smoothing, spacing fix) with auto-recompile of saved fonts on next handwriting-page visit. TestFlight question answered in chat (invite link + TestFlight = two links for now, one account).

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

## TestFlight status (Oct 15): BUILD 26 APPROVED — current (the Oct 14 round). Previous: build 25
Build 1.0(25): the last fix from the overnight Oct 12-13 session (Welcome screen buttons cut off on shorter phones, commit 04a258d) — it was committed at 00:58 but never built/uploaded. Uploaded Oct 13 ~1:08am, approved same hour (IN_BETA_TESTING on original group BRW6MMEJ). Now in round-protocol mode: collect ALL tester feedback before the next fix round.
GOTCHA (Oct 13, fixed): scripts/ios/qutenote_testflight.js was written for the FIRST build — it created a NEW "Public Beta" group every run and polled "latest build" (grabbed build 24 when run right after the 25 upload, and created a duplicate group). Duplicate group deleted (FIREFLY). Script now requires the build version as arg 1, takes what-to-test notes as arg 2, and always reuses original group afef6516 (BRW6MMEJ).

## Earlier (Oct 12-13 overnight): BUILDS 19-24 APPROVED
Fast feedback-response session (commits ba7e5d6..04a258d): Send/Account/Address screens matched to mockups, lined background everywhere, emoji nav icons, real back buttons; new Welcome/Sign up screens + notification preferences + auth error hardening; three auth bugs fixed from TestFlight feedback; Log in screen rebuilt to approved design with email-or-username login; hotfix for login lockout on older builds; birthday dropdowns restored, scroll-to-top, tighter Google redirect. Build 24 = last one approved and live (IN_BETA_TESTING). Tester feedback burst ~11pm-midnight Oct 12 (login, username login, birthday entry, scroll position) drove builds 23-24 and the unshipped Welcome fix.

## Earlier (Oct 12): BUILD 18 APPROVED
Build 1.0(18): Handwriting Phase 1 — write your alphabet on-screen (4 sessions: lowercase/uppercase/numbers/punctuation, 68 chars), compiles into a real font client-side (perfect-freehand + opentype.js, free/no paid API), shows up as "You" pen option on Write Note once any letters captured. New HandwritingFont table live.
Phase 2 (printed card uses the custom font) is deferred — Emerald is printing at home for now, so no Lob-custom-font problem to solve yet. Revisit together once she's tested Phase 1.

## Earlier (Oct 12): BUILD 17 APPROVED
Build 1.0(17): color brightness pass — index.css ink/lavender tokens now match the design file's tokens.json exactly. Home card 1 + QTs invite box switched from pale lavender-light to vivid lilac (were washed out next to neon-pink/lime siblings).

## Earlier (Oct 11-12): BUILD 16 APPROVED
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
