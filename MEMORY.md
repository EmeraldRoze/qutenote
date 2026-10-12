# QuteNote — Working Memory
Last updated: 2026-10-06 (evening)
Current phase: iOS App — first TestFlight build uploaded, waiting on Apple processing/beta review
Current task: Build 1.0(1) uploaded to App Store Connect. Watcher script submitting beta review + creating public TestFlight link.

## Stack
Frontend:      React + Vite + Tailwind CSS (web app, mobile-friendly)
Backend:       Node.js + TypeScript + Express
Database:      PostgreSQL on DigitalOcean Managed DB (migrated, live)
Hosting:       DigitalOcean App Platform (auto-deploys from GitHub main)
Domain:        cutenote.club (Cloudflare DNS + SSL)
Auth:          Custom JWT (30-day tokens, localStorage as 'cn_token')
Print service: Lob (wired into POST /notes, Phase 4 adds admin dashboard)
Payment:       Stripe — $7.95/month for 2 notes, $2/extra (Phase 3 complete)
AI assist:     Claude API (Anthropic) — key not yet in DO env vars
Email:         SendGrid (Phase 7)

## Project Directory
~/Documents/QUTENOTEDEV

## GitHub
https://github.com/EmeraldRoze/cutenote
Branch: main (auto-deploys to DO on push)

## Live App
https://cutenote.club
https://cutenote-74rm3.ondigitalocean.app (DO default URL)
DO App ID: d424b3b9-46a9-42df-af3c-993f4b2fb532

## How to run things locally
Start everything:    npm run dev              (from project root)
API only:            npm run dev -w apps/api  (port 4000)
Web only:            npm run dev -w apps/web  (port 3000)
DB migrations:       npm run db:migrate -w apps/api
DB visual browser:   npm run db:studio -w apps/api
Typecheck API:       cd apps/api && npx tsc --noEmit
Typecheck web:       cd apps/web && npx tsc --noEmit

## What has been done (append-only)
2026-04-09 — Phase 0: discovery, stack decisions, prd.json with 8 phases
2026-04-09 — Phase 1: monorepo, Prisma schema, Express auth API, React frontend (sign up / login / home)
2026-04-10 — Phase 2: 6-step send flow (StepRecipient, StepOccasion, StepCard, StepWrite, StepFont, StepReview)
2026-04-10 — Phase 2: POST /notes and POST /ai/madlibs API routes added
2026-04-10 — Phase 2: "Send a Cute Note" button wired up on HomePage
2026-04-10 — GitHub repo created (github.com/EmeraldRoze/cutenote)
2026-04-10 — Deployed to DigitalOcean App Platform (~$5/month)
2026-04-10 — Cloudflare DNS configured — cutenote.club is live
2026-04-10 — Stripe checkout, webhook, portal routes added
2026-04-10 — Lob postcard integration wired into POST /notes
2026-04-10 — Address entry API and page built
2026-04-10 — Design system applied, connections route and seed data added
2026-04-16 — Phase 3: subscription gate, allowance deduction, $2 overage, Pass It Forward API, notes counter on home
2026-04-16 — Phase 4: Lob address verification, admin dashboard, admin note status updates, sender notification on ship

2026-04-20 — Rebranded CuteNote → QuteNote across all code and config files
2026-04-20 — New landing page (warm editorial design) added at / for visitors
2026-04-20 — Pricing updated: $7.95/month, $3.00 per extra card
2026-04-20 — Removed Ralph loop (scripts/ralph/) — working directly with project owner from now on
2026-04-20 — Fixed multiple deploy failures: missing Phase 5 files, unused TypeScript variables
2026-04-22 — PDF download feature on admin dashboard — generates printable 6x4 postcard (front: card design, back: note text + address)
2026-04-23/24 — (recovered from git history; MEMORY.md was not updated at the time) Birthday field at signup, Sign in with Google, trust proxy fix, compose-without-subscription, connection approval flow + private profiles, remove connection button, privacy toggle, home page redesign, email-exact-match user search
2026-05-04 — (recovered from git history) Writing prompts + invite flow, 3-at-a-time prompt refresh, AI Help tab removed (Blank + Starters only), profile page with Quties list, tone selector removed
2026-10-06 — iOS app work started. API base URL made configurable (VITE_API_BASE), capacitor://localhost added to API CORS allowlist
2026-10-06 — Capacitor installed in apps/web (appId club.cutenote.app, appName QuteNote), iOS project generated, web build synced, app builds and runs in iPhone 18 Pro simulator showing the landing page
2026-10-06 — App-mode polish: native app skips landing page straight to /login (isNativeApp in lib/native.ts), safe-area padding via .native-app class + viewport-fit=cover, capacitor backgroundColor cream + contentInset never (automatic caused white strip), landing nav hides section links under 640px. Verified in simulator
2026-10-06 — Sign in with Apple: appleId column in schema (NOT yet on live DB), POST /auth/apple verifies Apple identity token via jose JWKS (aud club.cutenote.app), apple-sign-in plugin + black buttons on Login/SignUp (native only), App.entitlements + CODE_SIGN_ENTITLEMENTS wired
2026-10-06 — Google in-app fix: /auth/google?native=1 sets state=native, callback redirects to qutenote://auth/success?token=; app opens Google in system browser (@capacitor/browser), appUrlOpen listener in AuthContext catches the token; qutenote:// scheme registered in Info.plist. Buttons render verified in simulator
2026-10-06 — FIREFLY bundle executed: live DB updated via prisma db execute (appleId column + Invite tables which were MISSING since May — invite feature was broken in prod), code deployed to DO (ACTIVE, /auth/apple verified live), Emerald's stamp icon + cream splash installed
2026-10-06 — Apple paperwork via ASC API: bundle ID club.cutenote.app registered (58AWMG6XQZ), Sign in with Apple capability enabled (PRIMARY_APP_CONSENT), provisioning profile "QuteNote AppStore" created + installed (cert NVA7KZQ4G5), app record created via browser (Emerald signed in) — App ID 6819877820, SKU qutenote-001
2026-10-06 — Build 1.0(1) archived unsigned, exported with manual signing exportOptions + ASC key flags, UPLOADED to App Store Connect. ITSAppUsesNonExemptEncryption=false in Info.plist. Watcher (scratchpad qutenote_testflight.js) polls processing → copies beta review contact from Dreambound → sets test notes → creates Public Beta group w/ public link → submits beta review

2026-10-12 — Handwriting Phase 1 shipped (FIREFLY): new HandwritingFont table (one per user, glyphs JSON + compiled fontData bytes). On-screen letter capture (4 sessions, 68 chars) -> perfect-freehand turns strokes into filled outlines -> opentype.js compiles a real TTF in-browser, no paid API. Shows live as 'You' pen option in Write Note once any letters are captured. Verified full round trip against live DB before shipping (save/get/serve all 200). Phase 2 (getting handwriting onto the PRINTED card) deferred -- Emerald is printing at home for now, not using Lob for these, so no urgent need to solve custom-font-in-Lob-HTML.
GOTCHA: local tsx-watch API dev server intermittently restart-loops on node_modules file-touch events (iCloud sync noise, same class as the documented iCloud-eviction issue) -- if a local request 502s, check api_dev.log for '[tsx] change in .../node_modules/...' restart spam and retry right after a fresh 'QuteNote API running' line, or just test against deployed prod instead.
GOTCHA: local API dev server needs STRIPE_SECRET_KEY etc pre-exported into the shell before launch (`set -a; source .env; set +a; npm run dev`) -- dotenv.config() in index.ts runs too late relative to notes.ts's top-level `new Stripe(...)` under tsx's CJS-style import hoisting, so plain `npm run dev` crashes on 'Neither apiKey nor config.authenticator provided' unless the vars are already in the environment.
GOTCHA: don't leave `QN_PROXY_PROD=1` web dev server running across sessions -- it silently proxies ALL local testing to production code, which 404s on any route added since the last deploy. If local '/api/...' calls 404 unexpectedly, check for a stale QN_PROXY_PROD process first.
2026-10-12 — Color brightness pass (FIREFLY): ink/text colors darkened to match design file exactly (#231A3A vs old #2B2238 etc), lavender-light/pale tokens updated to design file's values. Found + fixed: Home's first carousel card and QTs invite box were using pale lavender as a bold fill (washed out next to their neon-pink/lime siblings) -- swapped both to lilac. Build 17 in review.
2026-10-11/12 — Full design update shipped (FIREFLY): new design handoff (qutenote-screens.zip) covered Welcome, Home, QTs, Profile, Settings (new page), Send. Tab bar: Dates/Profile reverted to line-drawn icons (torn-paper only for Home/QTs per spec). New card catalog replaces Round D's fictional artists with real roster (@ellis_tolsma real art, 4 placeholder artists) -- lib/cards.ts + server copy in submitNote.ts, keep in sync. User.birthday now editable (Settings > Account). Kept real pricing ($7.95/mo, $3.49 overage) over mockup placeholders. Push failure reason now surfaces in UI (was swallowed silently) -- still waiting on Emerald's device to register for the live test. Build 16 in review.
2026-10-09 — Round D shipped (FIREFLY): 15 TestFlight feedback items. Upload table live on prod DB (photos stored in Postgres, served at /api/uploads/:id — Lob fetches fronts there). 5-artist card catalog (lib/cards.ts + server copy in submitNote.ts — keep in sync!). Fixed: cardDesignId was hardcoded null on save; copy-link copied bare domain; blob: photo URLs never reached server. Invite links now /i/username-xxxx. Build 15 uploaded + in review.
2026-10-09 — Nav emoji round (FIREFLY): full tab bar now torn-paper emoji (house/bff/calendar/blush in /emoji/), og:image swapped to lime-heart postmark at /og-image-v2.png (new filename = cache-bust pattern). Web ACTIVE, build 13 uploaded + submitted.
2026-10-09 — Build 11 APPROVED (C1 shipped: push reminders + 2h edit window). Mini-round: BFF bunny-ears emoji (Emerald's torn-paper art, /emoji/bff.png) added to QTs tab bar (grayscale when inactive) + next to Your QTs title. FIREFLY'd: web deployed (ACTIVE), iOS build 12 uploaded + beta review submitted.
2026-10-08 — Domain consolidation (FIREFLY): Stripe webhook -> qutenote.com, GitHub repo renamed EmeraldRoze/qutenote (DO spec updated, deploy verified), cutenote.club 301-redirects to qutenote.com via Cloudflare rule. Folder renamed ~/Documents/QUTENOTEDEV
2026-10-08 — Brand kit applied from Emerald's qutenote-web-assets.zip: watercolor wordmark (public/brand/logo.png) on Login/SignUp/Home, 20 torn-paper emoji (public/emoji/) via QEmoji component across occasions, review step, card picker, badges, celebration pages, landing Join button. Build 4 uploaded with it all

2026-10-08/09 — Landing page restyled to watercolor brand (cream paper, plum Recoleta, white nav with wordmark, plum footer), then Emerald's full website copy applied verbatim + fonts unified to app set (Recoleta/DM Sans/Caveat; Lobster and Lora removed). Verified in local preview, deployed, confirmed live
2026-10-09 — Google sign-in in-app fix: callback for native now serves a "You're signed in / Open QuteNote" page with tap-to-return button instead of silent qutenote:// redirect (iOS blocks silent custom-scheme redirects). Server-side only, no new build needed. Awaiting Emerald retest

2026-10-09 — Font watermark fix (trial Recoleta renders fi/fl as Latinotype watermark boxes — ligatures disabled globally; OPEN: license real Recoleta or swap before public launch). Build 5 approved with it
2026-10-09 — Round edits from Emerald: handwriting font is Rock Salt everywhere (--font-handwriting + landing, sizes tuned down since Rock Salt runs wide; postcard PRODUCT fonts untouched), Free Profile card copy updated, FAQ title back to "Good questions.", full website copy + fonts from her doc applied. All live on qutenote.com

2026-10-09 — NEW DESIGN SYSTEM applied from "QuteNote iOS Design Guide.docx" (Downloads): Ultraviolet #5A32D6 sole action color, Unbounded headlines (never bold), Anonymous Pro body/buttons (caps + tracking), ruled cream paper, lavenders #A78BC7/#D9C9F1/#EEE6FA, stone, lime #C6FF3D (countdowns/new dots only), ALL pinks retired, Recoleta+Rock Salt+DM Sans retired (trial-font licensing issue dissolved). Implemented via index.css token aliases (old var names map to new values) + landing :root retokenized. Quties -> QTs renamed. Price stays $7.95 (guide settle-item; Stripe reality). Favicon served as /favicon-v4.png (CDN cache workaround — CF token can't purge). Build 6 uploaded
2026-10-09 — NOT YET BUILT from the guide (future rounds): status rows/popup, lime countdown nudge cards, stamp book, handwriting capture, group cards, 5-tab bar with + button, onboarding flow, 2-hour edit window, occasion-in-prompt-dropdown

2026-10-09 — HOME + SEND FLOW REBUILT from Emerald's board (design/redesign-oct-2026, incl. exported HTML with exact styles): new HomePage (Happenings status row + composer sheet, time-of-day Unbounded greeting, lime countdown nudge card from important-dates, merged statuses+sends feed with hearts and new-dots, empty states), TabBar component (Home/QTs/SEND-stamp/Dates/Profile), 4-step send flow (Choose a card w/ TO row + recipient sheet, Write w/ occasion-in-prompts dropdown + pen row, Ready to send postcard preview, It's on its way). Backend: Status + Heart models, /statuses routes (POST, mine, home-feed merged w/ heart counts, heart toggle). /dates route added. Old StepOccasion/StepFont/StepWrite/StepCard/StepReview now unused (cleanup needs FIREFLY to delete). Verified end-to-end in Chrome vs local dev proxied to prod API (QN_PROXY_PROD=1 in vite.config). COMMITTED LOCALLY, NOT PUSHED — needs FIREFLY: db push (Status/Heart tables), deploy, build 7.

2026-10-09 — WEBSITE HOMEPAGE rebuilt from "QuteNote Website – Homepage · desktop.html" (a self-unpacking bundle export — real markup lives in the __bundler/template script island, images base64 in __bundler/manifest; extraction script pattern in scratchpad). Faithful JSX port into LandingPage.tsx: ink wordmark (public/site/logo-ink.png), hero postcard collage w/ lime IN 7 DAYS, steps, Why Be Qute, featured-artists polaroids, ultraviolet bleachers section, details/summary FAQ, rotated join postcard, burger mobile menu. 17 named artworks in public/site/. Judgment calls: artist placeholders filled with Luna Park/Doodle Co./Inkwell/QuteNote Studio (she should supply real names), step-04 truncated copy restored from her copy doc. Deployed + verified live.

2026-10-09 — Site-bundle round (Emerald delegated the calls): og/meta tags + og-image live; EarlySignup table + POST /early-access (rate-limited, upsert) on prod; homepage forms now save to the list inline ("You're on the list" + Create your profile button); homepage prerendered into dist/index.html at deploy (apps/web build:deploy = vite build + SSR entry + prerender.mjs inject; DO web build command updated to build:deploy; plain `npm run build` stays clean for iOS so the app never flashes the landing). All verified live (endpoint 201, "muffin butt" present in raw homepage HTML). Early-access signups live in the EarlySignup table — build an admin view later. One marker row: firefly-verify@qutenote.com

2026-10-09 — APP SCREENS BOARD (26 screens) received as "QuteNote App Screens.html" (nested bundler export; extraction scripts in scratchpad/appscreens). IMPORTANT: the board is an older style iteration (Karla/Young Serif/old purple, "Quties", standalone occasion screen) — the Oct 2 Design Guide retires those; we use board LAYOUTS/COPY rendered in the guide system (Unbounded/Anonymous Pro/Ultraviolet, QTs).
2026-10-09 — Round A built: ProfilePage (membership card w/ real allowance+credits, stats, privacy segmented, handwriting Coming-soon teaser, stamp book rendering existing badges as stamps, Sent/Received postcard grids via /notes/sent+/received), ConnectionsPage as "Your QTs" (invite teaser, context lines from important-dates, Add QT/requests/Write/remove, privacy), InvitePage (hero, joined/earned stats from /invites, iMessage-style preview, Invite-by-text + Copy link). API: invite completion now grants inviter +1 giftedCredit ("Every friend = a free card"). All verified in browser vs live API. COMMITTED, NOT DEPLOYED.
2026-10-09 — Round B remaining from board: onboarding screens 0-4 (Welcome/Sign up/Pick first QTs/Add birthdays/Turn on reminders), send-flow board refinements (status-reply contextual entry, occasion screen -> keep guide dropdown), handwriting capture 15-17, group cards 18-20, recipient claim flow 21-25

2026-10-09 — ROUND B BUILT (not yet shipped): Onboarding (WelcomePage front door for native, /onboarding/qts+birthdays+reminders with board copy, signup -> onboarding), 21 TestFlight feedback items from Emerald+Flo fetched via ASC betaFeedbackScreenshotSubmissions API (screenshots downloadable — great round-trip pattern). Fixes: no pinch-zoom/no sideways scroll in app, ink logo everywhere, new stamp app icon (ink heart-Q), Profile (title word gone, boxes gone, stats jump to postcards, Happenings row, emoji avatar picker w/ PUT /users/me avatarUrl whitelist), send flow (prompt ellipsis stripped, EDIT NOTE on review, subscription wall with Subscribe-and-send), Subscribe copy (prompts not AI, personal handwriting), invites via sms: composer (POST /invites phone now optional -> returns link; Text-a-friend on QTs; typed flow fallback), Dates (emoji per type, Other custom label, friend autocomplete), og-image = new stamp, Google interstitial 50ms. HappeningsRow/StatusComposer extracted to components/Happenings.tsx.

2026-10-09 — C1 BUILT (not shipped): Push reminders — apns.ts (HTTP/2 + ES256 JWT, Dreambound team key CXSX9P9S8Z, topic club.cutenote.app, key via APNS_KEY_BASE64 env or local .p8), scheduler.ts (every-minute loop in API process: submits due notes; daily 15:00 UTC birthday pushes 7 days ahead, dead tokens pruned), DeviceToken model + POST /devices, @capacitor/push-notifications + aps-environment entitlement, enableReminders() wired to onboarding Turn-on-reminders + Dates page card. 2-hour edit window — Lob submit moved out of POST /notes into lib/submitNote.ts (scheduler submits PENDING notes older than 2h), PATCH /notes/:id (owner, PENDING, within window; text+pen only), sent screen explains window + EDIT THIS NOTE -> write step -> Save changes (PATCH). SHIP NEEDS FIREFLY: DeviceToken table, ASC PUSH capability + profile REGENERATION (old profile lacks push entitlement — must delete/recreate/reinstall before archiving build 11), DO env APNS_KEY_BASE64 on api, deploy, build 11. End-to-end push test plan: after Emerald enables reminders on build 11, query DeviceToken on prod and fire a test push locally.

## What I am working on right now
iOS app conversion (Emerald's priority as of Oct 6). Capacitor wrapper works in simulator. Remaining Phase 5 web items (CN Score, badges, connection birthdays) are parked until the iOS app ships.

## Next 3 things to do
1. Confirm beta review approval, send Emerald the public TestFlight link, have her test on her phone (especially Apple + Google sign-in, both unproven on a real device)
2. Collect Round 1 feedback (per round protocol: collect ALL feedback before starting fixes)
3. Later rounds: bump CURRENT_PROJECT_VERSION in ios/App/App.xcodeproj for EVERY new upload; then remaining Phase 5 web features (CN Score, badges, connection birthdays)

## QuteNote iOS facts
- App Store Connect App ID 6819877820, bundle club.cutenote.app, SKU qutenote-001
- Profile "QuteNote AppStore" (uuid 13ea71be-...) installed in ~/Library/MobileDevice/Provisioning Profiles and Xcode UserData
- Upload pipeline: VITE_API_BASE=https://qutenote.com/api npm run build -w apps/web → npx cap sync ios → xcodebuild archive CODE_SIGNING_ALLOWED=NO → xcodebuild -exportArchive with exportOptions (manual signing, destination upload) + ASC auth key flags
- ASC helper + exportOptions.plist + watcher live in session scratchpad — copy asc.js/exportOptions.plist into a project scripts/ios/ folder if needed long-term

## iOS build facts
- Native project: apps/web/ios (Capacitor, SPM not CocoaPods)
- Native build = `VITE_API_BASE=https://qutenote.com/api npm run build -w apps/web` then `npx cap sync ios` from apps/web
- Simulator check: xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO build
- Apple credentials from Dreambound are reusable: ASC API key Y5NXGFNCFV (~/.appstoreconnect/private_keys/), issuer a8f9ba85-917d-49e9-888e-e128d4ef6822, Team 97276PB95S, cert "Apple Distribution: Emam Cohen" in login keychain. Key cannot do cloud signing — QuteNote needs its own provisioning profile made via ASC API (same pattern as "Dreambound AppStore" profile)
- Postcards are physical goods, so Apple guideline 3.1.3(e) lets Stripe checkout stay (no Apple IAP cut)

## Things I learned the hard way
- DO App Platform must build from the REPO ROOT (not apps/api source_dir). Packages are hoisted to /workspace/node_modules — if you build from apps/api only, dotenv and other deps can't be found at runtime.
- Prisma generate MUST run before tsc or the client won't initialize at runtime.
- TypeScript strict mode requires `import type { Foo }` for type-only imports.
- DO prunes devDependencies at runtime. Always compile to JS (tsc → dist/) and run `node dist/index.js`, never tsx in production.
- tsx watch is for local dev only. Never used in production.
- Kill existing processes before starting locally: `lsof -ti:4000 | xargs kill -9`
- Auth endpoints (register/login/me) each have their own `select` — update all three when adding user fields
- Stripe Invoice type doesn't expose .charge — cast via `any` with fallback
- ~/Documents is synced by iCloud with "optimize storage" — after months idle it evicts big files (node_modules) and commands fail with ETIMEDOUT reads. Fix: `brctl download <folder>` and wait. Consider pinning the project folder "always keep downloaded"
- First app launch in a fresh simulator can show a white screen for several seconds — relaunch/wait before assuming a crash
- Renaming the project folder gives Xcode a NEW DerivedData path — always resolve the freshest App.app with `ls -dt ~/Library/Developer/Xcode/DerivedData/App-*/.../App.app | head -1` or the simulator installs stale builds
- Xcode may skip recopying the Capacitor public folder on incremental builds — if web changes don't show in simulator, delete the built App.app and rebuild

## Files changed in most recent session (2026-04-20)
- apps/web/src/pages/LandingPage.tsx (new — full landing page)
- apps/web/src/pages/HomePage.tsx (extra card price $2→$3)
- apps/web/src/App.tsx (added LandingPage import + route)
- apps/api/src/index.ts (CuteNote → QuteNote)
- apps/api/package.json (@cutenote → @qutenote)
- package.json (cutenote → qutenote)
- prd.json (CuteNote → QuteNote)
- prd.json (phase-4 passes: true)
