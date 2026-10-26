# QuteNote — Handoff / Status Board
Written: 2026-10-06 (replaces stale April 10 handoff). Last updated: 2026-10-25 (evening).

## OCT 25 EVENING — LIVE PUSH (FIREFLY: "do all the things"): 15 commits deployed, site + API ACTIVE, NO new build yet
- DEPLOYED: everything below from today. DO deployment 43544382 ACTIVE 03:42Z, /api/health ok, site 200.
- PHOTO PREVIEW ROOT CAUSE (her "upload a photo preview still not working", and it affected the REAL app too): GET /api/uploads/:id answered with helmet's default `Cross-Origin-Resource-Policy: same-origin`. The app is never same-origin — TestFlight runs from capacitor://localhost, Qute Dev from the mini's LAN address — so every uploaded photo was downloaded and then refused by the webview, and voice notes would have failed the same way. Fix: that route now sends `cross-origin` + `Access-Control-Allow-Origin: *`. VERIFIED LIVE: an <img> from the dev origin went from BLOCKED to LOADED 1320x809.
- BUTTON HISTORY (do not redo this): the global no-long-buttons sweep was REVERTED on her call ("you made every button in the app our stamp border and its too much"). Every in-app button is back to its pill. ONLY Log in / Sign up / Create account wear a stamp, and it is SQUARE: her real perforated border, four equal sides, 102px, 14px type, LOGIN as one word. .qn-action-square in index.css, used WITH .qn-stamp.
- SIGNUP SKIPPED ADDRESS + BIRTHDAY (real bug, traced in a browser): register signs the person in and navigates to /signup/address in the same tick; React applied the sign-in one render BEFORE the route, so PublicRoute saw "logged in on /signup" and fired its go-Home redirect. Fix: lib/postAuthRoute.ts keeps a `qn_setup_next` sessionStorage breadcrumb; PublicRoute honours it; SignUpPage/PickHandle/SignupAddress set it, SignupBirthday clears it. Social sign-ins claim '/signup/handle' before login() for the same reason. Apple sign-in "didn't ask for my address" was NOT a bug — emmasirena33 already has one.
- HOME CARD GLITCH: the sheen was a single band across a layer that snapped back every 10s (measured: 54 levels of brightness jump). Now it repeats on the same 320px period (jump measured at 3/255), the drifting layer is only as big as its travel, and card + layer are GPU-promoted so the rounded clip is cut once instead of every frame. HER VERDICT STILL PENDING.
- LOGO is now type, not art: heart Q (re-cut as a whole COMPONENT — a rectangular crop chopped its tail) + "uteNote" in Unbounded 300 + waves dropped down/right, and the whole lockup is masked with /brand/ink_grain.png so it reads as a rubber stamp. components/Logo.tsx.
- ART: her INVITE envelope on the QTs box (/emoji/invite.png), her PADLOCK on both address screens (/emoji/lock.png). Cut with an edge flood-fill; the lock also needed a second fill seeded INSIDE the shackle so the hole is transparent.
- SEND: the top panel now swipes the WHOLE library (15 cards, all artists) with the artist name following the card; tapping an artist below scrolls the panel to their first card. Home carousel arrows now stopPropagation (they were opening the invite page because the whole card is a tap target).
- ALSO: Deets lost the + and the emoji picker; birthday reminder stamp got vertical padding and its own line per sentence.
- CLEANUP: the five @qutenote.test accounts I made while tracing the signup bug are deleted. 22 accounts remain (includes her own "hyu" throwaway — hers to keep or kill).
- ICON AUDIT for her to paint: back arrow (11 screens), magnifying glass (4), check mark (3), arrow-right (3), QR square (2), then bell, gear, chevron-down, plus, X, the four voice-sheet controls, carousel arrows. Still typed emoji: 💌 (4 places), 🤫, 🌷. Apple + Google marks must stay official.

## OCT 25 — ANALYTICS BRIEFING, SPEED FIX, NO-LONG-BUTTONS SWEEP (committed locally, NOT pushed, no build)
- ANALYTICS (standing duty, briefed her): 21 accounts, 1219 events, 135 sessions. Send funnel 72 card → 19 recipient → 13 write → 4 review. Features: handwriting 7, voice 3, flower 2, secret 1. Screens: /home 181, /connections 57, /send 52, /dates 52. Dashboard exists at /admin/analytics (AdminAnalyticsPage) — she answered "both" (dashboard + briefings), which matches the Oct 22 interview.
- WALL FLAGS WERE HALF-FAKE: tap/screen crumbs were logged TWICE in dev-build sessions (14 of 135 sessions, 150 events). Cause: analytics effects re-running (StrictMode in the dev webview) adding a second document click listener. Fixed in lib/analytics.ts: `tapTrackingInstalled` guard + trackScreen ignores the same path within 1s. Her dashboard numbers were ~12% inflated.
- REAL DEAD BUTTON: tapping the tab you are already on did nothing (she rage-tapped Profile 4x on her own profile). TabBar now scrolls to top on the active tab, and ONLY your own profile lights the Profile tab (another person's profile used to light it too).
- SLOW /home (4042ms) was a dev-build artifact, BUT the real cause underneath was art weight: emoji were ~1000px, 1-2MB each, drawn at 32-64px. Rebuilt at 3x display size: emoji 17.8MB → 6.1MB, brand 6.5MB → 4.8MB. scratchpad scripts shrink_emoji.py / shrink_apng.py. APNG rule honored: optimize=False, durations copied, PIL may merge identical neighbour frames (party 6→5 frames, same 900ms total — fine). bff-live.png left alone (invite card renders it at 238px).
- API IS FAST: prod /statuses/home-feed, /connections, /important-dates all 170-600ms with her real data. Not a server problem.
- NO LONG BUTTONS (her rule, verbatim: "no long buttons anywhere. you dont need to create any other rules"): new `.qn-action` / `.qn-actions` / `.qn-actions-row` in index.css = die-cut stamp edge, width of the words, `--qn-panel` picks the face colour (var(--btn) for the main action). Swept 25 files; SendFlow's primaryPill/secondaryPill constants deleted; CardScanPage's bigButton() now only returns colours.
- DELIBERATELY NOT CONVERTED (told her): Settings list rows, QT person rows, Home carousel cards, handwriting section rows (lists, not buttons) and the tiny 34px Yes/No request chips (stamp perforations go chunky that small). Admin screens skipped.
- AUDIT TECHNIQUE: public/__audit.html (temp, deleted) walked every route in a same-origin iframe and reported any button ≥62% of a 390px viewport; public/__preview.html (temp, deleted) injected a signed token then redirected, for headless screenshots. Mint a token with jsonwebtoken + JWT_SECRET from root .env.
- FORMAT PACK for her Claude mockups: ~/Desktop/QuteNote-Format/ (READ-ME-FIRST.md, qutenote-format.css, screen-template.html, design-rules.md, screen-inventory.md), copy committed at design/format-pack/. Art is referenced by live qutenote.com URLs.
- STILL OPEN: acorn needs to move DOWN to the base of the bouquet; printed-card PDF stamp is still the old design; taller invite card?; tab icons in full colour?; dusk card drift?; stamp-collection empty-state copy.

## OVERNIGHT ROUND Oct 24 ~3-4am (FIREFLYs) — BUILDS 53 + 54 UPLOADED, website deployed twice more
- BUILD 53 then BUILD 54 (she went to sleep after 54). Both verified before upload: entitlements present, build number + prod API baked, capacitor.config has no server.url.
- SIGN-IN BUG, root cause: Qute Dev and the TestFlight app BOTH registered `qutenote://`, so iOS handed Google's token to whichever app it liked — usually the TestFlight one. That is her "logged in with Google and got kicked out" AND "can't login on dev". Fix: dev build gets `qutenotedev://` (PlistBuddy line in scripts/ios/dev-phone.sh, restored on exit), /auth/google takes `&dev=1` → state `native-dev` → that scheme, AuthContext accepts `/^qutenote(?:dev)?:\/\//`. Email+password on dev was always fine (CORS allows the LAN :5173 origin; verified live).
- WEBSITE: hero postcard stamp rebuilt with the photoreal cardstock edge (mask tile 7px for its small render size) + shadow stack; the flying `.mini-pc` postcard removed from the mailbox demo (her mailbox APNG already posts a letter); "Support Artists" replaces "The card aisle is so BLEH." and the FEATURED ARTISTS kicker is gone; "Being remembered feels pretty wonderful." trimmed.
- THOUGHT BUBBLE ANIMATION: her 5-frame strip (~/Downloads/Watercolor Thought Bubble Sequence.png) sliced by column runs, frames aligned on the TINY BUBBLE's bottom-left corner (the only landmark in all five), APNG forward + reverse + a blank beat. LANDMINE: PIL's `optimize=True` crops each frame to its own bbox and Safari placed those crops wrong (her "cut off weird") — always optimize=False for APNG. Same file serves the app (/emoji/thought-bubble.png) and the site (assets/emoji-thinking.png, NOT webp).
- SCALED STAMPS LOSE THEIR SHADOW: the card-preview stamp is built at 84x94 and `transform: scale()`d, which shrinks the drop-shadows too — radii are now divided by k so the edge reads at any size.
- Also in 53/54: Instagram-style Home search (live matches + invite-by-text when nobody matches), Lavender dusk dates card, diagonal living ombre, slate calendar, twinkling cakes everywhere, QTs birthday countdowns from profile birthdays, bigger invite hands (QTs box 64→102, Home card to the card's limit), profile QR moved beside notifications/settings, "None sent yet." empty states, signup cake 64→192 with the band grown to 324px.
- BUILD GOTCHA: `npm run build` runs `tsc -b`, which catches things `tsc --noEmit -p tsconfig.json` does NOT (it caught a hook used before its state was declared). Always build before archiving.
- OPEN FOR HER: stamp-collection empty state still says "...someone came to mind, didn't they?"; taller Home card for a true 70% hands?; tab icons in full color?; dusk card drift?; printed-card PDF stamp still the old design; acorn-at-the-bouquet-base feedback item still open.

## BIG POLISH ROUND Oct 24 ~2-3am (FIREFLY) — 20 more commits deployed (site + API), STILL NO NEW BUILD
Everything below is live on the website/server and in Qute Dev; phones are on build 52 until we archive again.
- HERO (website): postmark raised above the headline + fly-in removed (static stamp, wax press still presses); every hero size now also answers to window height via `min(x, Nvh)` so a short laptop window can never slice the headline (her "all of this is cut off on desktop"). Bleachers megaphone re-cropped (emoji-megaphone-v2.png: the file was cut through the sticker outline, capped it and trimmed the padding) and moved in from the right edge.
- CAKE: her twinkling-cake package shipped. New chocolate/lavender art everywhere (app + site + /site/cake.png), `TwinklingCake` component (components/TwinklingCake.tsx) + .qn-cake/.qn-flame/.qn-glow in index.css, flames sized in % of the cake so one component covers 32px chips and 160px cards. Website cakes wrapped too (hero floaty, phone-demo notification, feature row). Reduce Motion stills them.
- STAMPS: the card-preview stamp is now the TAB BAR stamp built at 84x94 and scaled as one piece (SendFlow StampSvg) — drawing it at 52px made chunky perforations, her "this stamp looks terrible". Tab bar stamp wears the photoreal .qn-stamp edge with `--qn-panel` (new variable) set to baby blue, and keeps BOTH its lift shadow and the stamp's own edge shading (an inline filter silently replaces the class filter — that was her "needs more contrast").
- HOME: Instagram-style people search (useUserSearch → GET /users?q=, 220ms debounce, results drop under the bar, tap → profile; no match → INVITE THEM BY TEXT via inviteByText). Search bar moved to the top of the band (252 → 186px, flex-start). Her Lavender dusk "Remember the important things" card added as the 5th carousel card (package: static ombre, no grain, ADD A DATE → /dates/add; the README's "update dots to 5" is moot, dots are chevrons now). Invite hands grown to the card's limit (~16%; a true 70% needs a taller card — ASKED HER).
- LIVING OMBRE, three takes, final: colors ride an oversized ::before layer (`--qn-ombre`, repeating gradient on the 145deg axis) that translates 184px/262px = exactly one 320px period, so it drifts top-left → bottom-right seamlessly; grain sits still on ::after. (Take 1 panned a 300% gradient = solid-color stretches, take 2 froze the ombre and moved a sheen = she hated it.)
- QTs: birthday countdown was only reading Important dates, so profile birthdays showed nothing. GET /connections now returns birthdayMonth/birthdayDay (day+month only, never the year) and the list prefers it; pills light blue; "Sorted by whose birthday is next." caption removed.
- Smaller: status pencil icons → her pen art (StatusBox + Happenings), pen circle removed, picker z-index 30 so it opens ABOVE the carousel (.qn-stamp isolates, it was trapped); profile tile = gift + "Invite friends,\nget free cards." + hands 48px; Dates pills light blue; calendar emoji repainted in her slate #495F68 (linear L remap from the ORIGINAL art — a gamma remap crushed it dull/dark first try); login subtitle "Slide into their mailbox."
- OPEN WITH HER: Google sign-in "kicked me out" (asked: Qute Dev or TestFlight? server side verified healthy); thought-bubble 5-frame strip still needs to land on disk before I can cut the APNG; taller invite card?; tab icons in full color (inactive tabs are greyed 45% by .tab-inactive)?; dusk card drift like its neighbors?; printed-card PDF stamp still the old design.

## PUSH + SITE FIX Oct 24 ~1:50am (FIREFLY) — 23 commits deployed, NO new build yet
- Everything from after build 52 went live: photoreal die-cut stamp boxes across the app, mailbox 10-frame story APNG, invite card living ombres (Venmo-style, Lemon sky then Lavender paper), invite page rewrite (every-10-friends copy, wax postmark), REFERRALS LIVE (a free card lands on every 10th friend who joins — apps/api/src/routes/invites.ts), invite SMS copy, new package emoji. No schema change, so no db push was needed.
- HER "the website is messed up" (phone screenshot, whole site shrunk into the left two-thirds): the CTA `.send-stamp` parks at `translate(170px,-190px) scale(2.2)` before its drop-in animation. On a phone that parked spot sits past the right edge, nothing clipped it, so the document measured 589px on a 371px viewport and Safari shrank the page to fit. Fix: `.cta{ overflow-x:hidden }` inside the max-width:860px block (hidden not clip, for older Safari). VERIFIED LIVE: docW 371 on a 371 viewport.
- DIAGNOSIS TECHNIQUE WORTH KEEPING: claude-in-chrome cannot resize her window below ~1000px, but you can embed the live site in a 390px iframe on itself (same origin) and measure `scrollWidth` vs `clientWidth` inside `contentDocument`, then walk the tree for `scrollWidth > clientWidth` with no clipping ancestor. Async IIFE results come back empty — stash the answer on `window.__probe` and read it in a second call.
- PHONES ARE STILL ON BUILD 52: none of the above is in the native app until the next build.
- Her open TestFlight items (all filed against build 48, three already fixed in 49): acorn needs to sit at the base of the bouquet; the card-preview stamp outline is still dashes (SendFlow.tsx StampSvg line 106) and should be the real stamp edge; ALL BUTTONS should wear the stamp outline and be only as wide as their text, no more full-width buttons (her new global rule).
- Squiggle-lines question withdrawn by her: "you have it right in Qute Note dev we just haven't shipped it."

## ANIMATION BATCH 2 Oct 24 ~12-12:30am — BUILD 52 + site deploy (FIREFLY)
- Watercolor mic (public/emoji/mic.png) on ADD A VOICE NOTE, the chip, and the voice sheet record button.
- WELCOME WAX PRESS: her 10-frame 2x5 sheet (ChatGPT share links: curl the page, grep backend-api/estuary public_content URLs, download the non-unfurl one) → silhouette-locked APNG (/brand/wax_press.png) overlaid on postmark_stamp_heartless at wax.ts geometry; ALSO inside the website hero postmark SVG (<image href>). Smoothing recipe: align every frame to the FINAL frame by alpha-overlap, cross-fade tweens + melt-back for the loop. Headless-Chrome CANNOT verify APNG motion (virtual-time doesn't advance it) — test on a real device via the dev server URL (e.g. 10.0.0.92:5173/brand/wax_press.png).
- HEART HANDS: seamless loop (close → ta-da hold → REOPEN through the middle frames + blends); file is why-hands.png (site, both spots) = bff-live.png (app invite card).
- Home carousel: INVITE CARD FIRST for everyone, periwinkle→pink ombre (#A2ABBE→#FF9DC9 + grain), animated hands at 238px; dots REPLACED by tappable edge chevrons per slide.
- Login: logo removed, sparkle heart 90px. App icon: wax postmark fills the box (static — iOS icons can't animate, told her).
- Qute Dev ops: relaunch after she quits = xcrun devicectl device process launch --device 00008150-000451E03C7A401C club.cutenote.app.dev (dev server on :5173 usually still up; check first). Phone preview of the waitlist = python3 -m http.server 5200 --bind 0.0.0.0 in waitlist/ → http://<mini-ip>:5200.
- PENDING: mailbox 10-frame story strip (prompt given: letter in, door shuts, flag up, letter out — destination TBD: alerts card / site phone demo); her wax-press-on-phone APNG verification never confirmed.

## LIVING EMOJIS NIGHT Oct 23 ~9pm-12am (FIREFLY for the round; "push all these animations live" = final deploy approval)
Workflow this stretch: edits held locally (NO push until her go), previewed on localhost:5200 (python http.server serving waitlist/ working tree) + Qute Dev for the app. scratchpad/flipbook.py = reusable strip slicer (white flood-fill → frames → APNG/WebP with per-frame durations).
- FLIPBOOK EMOJIS from her 4-frame AI strips (prompt format that works: ONE image, horizontal sprite strip, identical frames, only the animated element changes): party face (kazoo rolls out, 6-frame breathe), camera (flash pops: 2.2s idle hold then burst), heart (sparkles trade gleams), heart-hands on the Why header (hands close around the card, ta-da dashes), megaphone on the bleachers band.
- HARD-WON TECHNIQUES: WebP SILENTLY DROPS per-frame durations (PIL) — use APNG everywhere; frames drift (10-40px!) — align via color-mask (pink body / baby-blue card / yellow body) argmax-overlap search; her "completely still" bar means FREEZE one base frame and transplant only the moving zones; when neighbor frames touch, cut at the thinnest ink column (17-43px bridges were invisible cuts) or extract whole components; strip art can carry baked-in grey smudges (visible only on dark bg) — when filters fail, synthesize the big frame from clean small elements (scaled+offset); edge-touching-component scrub DELETES own art if it reaches slice edges (check before trusting).
- SITE EDITS: bff emoji → heart-hands art everywhere in app; new heart + party art; hero heart floaty +25%; gift box on Free Profile; "Put it in writing, babe." CTA (the app still says "Someone came to mind, didn't they?" in Profile empty state + stamp box — flagged, awaiting her call); signup fields = app-style stamp boxes (scallop wrapper + paper strip + rosy inset + light blue), name stacked over email; "We're here for actual connection." title w/ hands flipbook (right on desktop via .in flex, below on mobile via #why media rule); favicon = green wax heart (favicon-v6/favicon-wax-heart, cache-bust names); apple-touch + og-image (og-image-v3 / og-image-wax) = wax postmark full-frame, logo gone (iMessage caches previews ~a day).
- APP SIDE: emoji APNGs (party/camera/heart-sparkle) + Find-your-people tile 86px are in the deployed web app; NATIVE BUILD 52 NEEDED eventually to bundle them into the phones' app.

## WAITLIST ROUND 3 + BUILD 51 Oct 23 ~8:30-9pm (FIREFLYs)
- Waitlist corrections: How-it-works progress .bar now var(--rule) (ruled-paper color, transparent track); .addq baby blue; floating .send-stamp = perforated edge + cream margin + blue face + oxblood SEND. LANDMINE: `.send-stamp span{}` styled the inner .ph holder too (the "white box" bug) — scope stamp-face rules with `>` and reset .ph.
- $0 → $FREE on the Free Profile card; heart hands CTA emoji doubled (96→192px).
- UNBOUNDED LIGHT (300) EVERYWHERE, her call: waitlist (13 rules + 2 implicit), app (30 files swept: any line with var(--font-display) and fontWeight 400/600 → 300; global h1-3 rule; Google Fonts link now wght@300 only). Shipped as BUILD 51 (FIREFLY) + website deploy. Wax letter images replaced initials so the 600 weight is retired.

## WAITLIST ROUND 2 Oct 23 ~8-9pm (FIREFLY) — website only
Shipped: her sealed-envelope art replaces emoji-envelope.webp; pricing $8.95→$16.95/mo; FAQ reworked (new opener "So I get an actual postcard in my actual mailbox?" answered "Yes.", how-do-you-send now 2nd, not-on-QuteNote answer = "Invite them! They need a free profile to receive mail.", launch = "Valentine's Day 2027!", the Qute Note SEO question REMOVED on her ask — alternateName + footer SEO hooks remain); JSON-LD FAQPage mirrors it. Demo: ghosts are now ABSOLUTE slots (top 96/192/288/384, 80px, r18) and .notif matches exactly = lock-and-key; postmark-waves.webp TRIMMED (had transparent padding that broke positioning) and .ph squiggles sit on the heart's right third (left:9px of 26px heart, empirically tuned); QTs demo initials circles → her wax letter hearts (assets/wax-m/j/r.webp); "Right on time." on its own line; pen replaces star on the words-won't-come tile; her new party-face art in emoji-party-popper.webp; band floaties replaced by a MIRRORED megaphone (scaleX(-1), right of text); heart-hands art replaces bunnies at the CTA (emoji-heart-hands.webp).
- NOTE: launch date Valentine's Day 2027 is her first stated launch target. Launch prep list: App Store review (not TestFlight), website login links restored, full-size artist files, Recoleta license.

## WAITLIST POLISH ROUND Oct 23 late night (FIREFLY) — website only, no build
Her 9 items with screenshots, all shipped: new emoji set copied from app public/emoji into waitlist/assets keeping old names (cake/camera/mailbox/party-popper/teary/bff-bunnies/thinking/heart→heart-sparkle); hero postmark SVG strokes → oxblood + wax heart recentered on the ring (center 98,96); postmark-waves.webp recolored oxblood in place; hero .card.back → blush Rose paper ombre; .stamp → perforated scallop edge + #F4ECE6 margin + #BADAFF center + wax heart img (dashed border gone); .feed-ghost 64→80px/16 margin so populated statuses fit the rectangles; .mini-pc is now her torn-edge postcard (assets/postcard-heart.webp, white flood-filled out, animation transform preserved).
- PREVIEW LANDMINE: the waitlist's scroll-animated sections render BLANK in headless Chrome (virtual-time doesn't run the scroll rAF loop; fragment anchors and synthetic scroll events don't help). The hero renders fine. For below-the-fold sections, extract the markup into a static harness with forced CSS state, or verify assets directly. Never diagnose "broken page" from a blank headless shot of those sections.

## WAX ALPHABET + BUILD 50 Oct 23 late night (her "Ship it")
- Her 26-letter wax seal alphabet sliced into public/brand/wax/A..Z.png (white-bg flood fill → connected components → ROW CLUSTERING by center-y gaps, NOT fixed bands — fixed quarter-bands scrambled letters after G; rows were 7/7/7/5).
- Profile + Account stamps: postmark_stamp_heartless.png (wax stripped from the profile stamp, same selective erase) + the FIRST initial's lettered wax overlaid in code. Geometry constants in src/lib/wax.ts (center 324/1272, 412/1272; width 417/1272 — reused for any render size via translate(-50%,-50%)). Non A-Z first letters fall back to the blank wax. My CSS-embossed initials are GONE (she called them terrible; her art replaced them).
- Profile's + emoji-picker button REMOVED per her ask (the picker still exists on Deets; ProfilePage's pickingAvatar sheet code is unreachable but left in place).
- Build 49 shipped mid-round (blank wax + CSS initials — superseded within the hour); BUILD 50 = lettered wax + no plus, uploaded + beta review submitted. Website deployed with each push.

## WAX HEART ROUND Oct 23 night — BUILD 49 (FIREFLY)
Her two TestFlight items on build 48 (screenshots fetched via betaFeedbackScreenshotSubmissions attributes.screenshots[].url — download with node fetch, curl gets empty files) + her wax seal asset (blank, no letter).
- ALL neon yellow hearts are now the WAX SEAL heart: public/brand/wax_heart.png (cut from her upload via edge flood-fill, interior highlights preserved). postmark_heart_stamp(.profile).png patched in place: felt heart + translucent shadow erased SELECTIVELY (yellow-hue or alpha<190 within the heart bbox — a rectangular erase eats the ring), wax composited 1.18x. send_stamp_heart.png overwritten (tab bar code unchanged). App icon regenerated. StampSvg (SendFlow) heart path → wax image. Printed card stamp box → doc.image(assets/wax_heart.png) with drawHeart fallback. Waitlist postmark-heart.webp overwritten with wax.
- FEED ROWS (Home): heart-sparkle avatar GONE; the friend's status emoji leads the row (updates with their status, thought-bubble fallback); the send-them-somethin' button moved INSIDE the status bubble (wax heart + oxblood squiggle svg) — this also killed the last old-purple art (postmark-heart-only/waves-only.png were still rendering purple waves in that button; images dodge hex sweeps, grep for /brand/ image refs too).
- EMBOSSED INITIALS on Profile/Account wax: color #758A14, textShadow '0 -1px 1px rgba(80,92,10,0.55), 0 1px 1px rgba(255,255,255,0.8)' (first pass #B6CC33 was invisible at 22px).
- Neon yellow stays for non-heart highlights (progress, pills, switches).

## PALETTE 4 FULL REPAINT Oct 23 evening — BUILD 48 (FIREFLY ~4:20pm; "move forward with build unless you have any other questions" = ship pre-approved)
Source: ~/Downloads/qutenote-app-palette4.zip (18 screen HTMLs + tokens.json + palette.md + assets; HTML copy is source of truth per its README). Oct 21 warm-palette draft on style-refresh is RETIRED, superseded by palette 4.
- FOUNDATION: index.css legacy vars remapped to palette 4 (ultraviolet/lavender aliases → oxblood #4A2424; stone/lilac/dashed → rosy brown #B4897A; cream → paper #F1EBE3; white → card #FBF8F3; lime → neon #EEFC4E; error warmed #B4453C). paper_texture.png tiled on body::before, title-band, tab bar (Emerald: texture on ALL backgrounds). New classes: .qn-stamp (perforated stamp box, masked pseudo-elements from the package), .rose-paper (ombre), .tab-inactive (warm tint filter).
- TAB BAR: perforated dusty rose SEND stamp (radial-gradient scallops + send_stamp_heart.png), active label #9E625F, no divider.
- ALL SCREENS restyled via 6-agent swarm (auth/onboarding, home+QTs, send flow, dates, profile+settings, undesigned screens incl. scan/handwriting/admin), copy word-for-word from the HTMLs. EXCEPTION kept deliberately: "Send a little somethin'" title (her explicit Oct 19 rename beats the older mockup copy "Send a card") — FLAGGED to her. Home subtitle is now always "Feelin' Qute?" per HTML (replaced the two dynamic variants).
- Artist catalog tints: apps/web/src/lib/cards.ts AND apps/api/src/lib/submitNote.ts kept in sync (palette tints).
- APP ICON: new palette 4 icon (neon heart in oxblood ring on paper grain) in AppIcon.appiconset.
- PRINTED CARD: admin-pdf.ts repainted (oxblood ink/QR, rosy ruling #C4A396, blush divider, neon stamp heart, dusty rose scan-me heart); QR re-verified decoding after recolor.
- WAITLIST SITE: css + inline colors repainted, new logo + regenerated white inverse webp.
- PREVIEWED pre-ship: 8 screens screenshotted via headless Chrome with a temporary public/__preview.html token injector (DELETED after), demo account applereview against prod data through vite's QN_PROXY_PROD proxy. Sent to Emerald.
- LANDMINES (new): npx tsx hangs when tsx isn't installed (use node dist or QN_PROXY_PROD vite proxy instead of a local API); claude-in-chrome couldn't reach localhost in her Chrome (headless CLI + token-injector page is the reliable preview path); headless screenshots clip ~70px on the right at any width (artifact, compare an approved screen before blaming layout).
- Ship: push → DO deploy; build 48 (icon + repaint, no schema change).

## VOICE NOTES + SCAN QR ROUND Oct 23 — SHIPPED AS BUILD 47 (second FIREFLY 11:45am: db push → deploy ACTIVE + health verified → build 47 uploaded, VALID, beta review submitted ~11am PT). Analytics from the Oct 22 interview are in this build too (first build with breadcrumbs — start /usage/summary briefings next round). Palette still held on style-refresh, she's reworking it.
(History: FIREFLY given 10:03am; first session died 2 min in when her computer shut down — rebuilt from the recovered plan.)
Her spec (answers recovered from the dead session log): QR on the printed card back (bottom right), scanning opens a screen with the card picture + Reply + Decode my secret message + Listen to voice note (last two auto-greyed when N/A); card saves to the scanner's Received section; Reply lands on pick-an-artist with the friend preloaded; voice notes max 60s via an "Add a voice note" button on compose; account required, download page if no app; notifications OFF for now.
- SCHEMA (NOT pushed to prod yet): Note.scanCode (unique, printed as QR), Note.voiceUploadId, new ReceivedCard model (userId+noteId unique). ⚠️ DEPLOY ORDER: prisma db push MUST happen BEFORE the API deploy — the new API selects these columns.
- API: /uploads accepts audio data URLs (mp4/webm/mpeg/wav/aac/ogg/x-m4a); POST /notes takes voiceUploadId (validated: sender's own audio upload) + stamps a scanCode (crypto base64url 12 chars) on every new note; GET /cards/scan/:code (auth) upserts ReceivedCard (skips sender scanning own card) and returns card payload; GET /notes/received merges addressed + scanned cards (dedup, newest first, 30 cap).
- PDF: QR bottom-right of back → https://qutenote.com/c/<scanCode>, "Scan me ♥" caption, printed on a light patch over the ruled lines; verified by rendering + jsQR decode. BONUS FIX: the stamp-box ♥ and caption heart are now vector paths — the built-in PDF fonts have no ♥ glyph, every card since day one printed "&e" in the stamp box.
- APP: VoiceNoteSheet (MediaRecorder, audio/mp4 on iOS, 60s cap, playback + redo, "PUT IT ON THE CARD"); ADD A VOICE NOTE button on the write step with attached-chip (REDO/✕); audio held in memory as data URL, uploaded on MAIL IT then voiceUploadId attached; drafts strip the audio (localStorage is too small); review step shows a Voice note row. NSMicrophoneUsageDescription added to Info.plist.
- SCAN SCREENS: CardScanPage serves /c/:code (public QR link) AND /card/:code (in-app). Logged out → "Someone mailed you a real one" landing (OPEN IN THE APP qutenote://card/<code>, GET THE APP = TestFlight link for now — SWAP TO APP STORE LINK AT LAUNCH, I HAVE AN ACCOUNT); the code stashes in localStorage (qn_pending_scan) and HomePage opens the card right after sign-in (1h window). Logged in → card picture, From X, REPLY TO <NAME> / DECODE MY SECRET MESSAGE / LISTEN TO VOICE NOTE (greyed per her spec). Deep link qutenote://card/<code> handled in AuthContext. Reply = /send?toId=&toName= (new SendFlow params, skips recipient step). CardSheet on Profile also got a LISTEN button for received voice notes.
- Analytics crumbs: voice-note, scan-card, voice-listen, reply-from-scan, decode (existing).
- Headless-Chrome screenshot gotcha: pages clip ~70px on the right at window-size=430 — an artifact (approved /login clips identically), not a layout bug.
- NOT DONE / NEEDS HER: db push + deploy + build 47 all await FIREFLY. Style-refresh warm palette verdict still pending (voice round merged into that branch for preview). Camera CV translation of Secret Language cards remains a separate promised round (the QR covers the "point phone at card" wish for now).

## PROTOCOL CHANGE (Emerald, Oct 17 — MANDATORY for every TestFlight round)
Before any plan or FIREFLY ask: clarifying questions about the TestFlight feedback go to Emerald ONE AT A TIME (she answers, the next appears). Every vague item gets a question — zero assumptions. Questions are mandatory pre-FIREFLY. Never bury questions in a long briefing.

## ⏰ REMIND EMERALD (she asked Oct 20, "next day or two")
1. USABILITY ANALYTICS INTERVIEW — she wants custom breadcrumbs on every screen: funnels (who starts a card and abandons where), feature discovery (what's loved vs invisible), usability brick walls (NOT crash monitoring, Sentry covers that). She wants to be INTERVIEWED about it, one question at a time. Question 1 pending her answer: consume via (A) admin dashboard, (B) Claude round-briefings, (C) both.
2. LIVE RELOAD SETUP — she wants her friend's workflow: iPhone plugged into the Mac mini, dev build sideloaded via Xcode, Capacitor Live Reload (capacitor.config server.url → local Vite dev server) so tweaks appear on her phone instantly between rounds. LANDMINE when built: NEVER ship a TestFlight build with server.url set — strip it for archive builds.

## BUILD 46 + SEO PART 2 Oct 19-20 (FIREFLY)
- HANDWRITING SAVE BUG (her "Not wirking, I'm on WiFi"): glyphs hit EXACTLY 100 keys (67 chars + 33 alternates) and the PUT /handwriting 100-key cap rejected every save after; client showed the generic connection error. Cap now 220 (67x3 + slack).
- ADD QT dead button: she already had a PENDING request to emmasirena33 (Oct 18, private account) → 409 swallowed silently. Fix: GET /connections/outgoing (pending followingIds) seeds the requested set on load so the button reads "Requested"; sendRequest treats 409 as requested.
- FLOWER: bud-vase short words (maxA: n=2→10°, n=3→15°); acorn+comma tuck to the bouquet BASE right of the stems (pull = max(0.26, prevWordW/2 - 0.18size)); comma hangs below the line (drop -0.12size web / bottom 1.22size PDF); numbers DON'T nestle. Mirrored in web FlowerText + api flower.ts.
- SEO part 2: FAQPage JSON-LD generated from the live FAQ (8 Q&As), canonical link, twitter:card meta, Organization sameAs → instagram.com/qutenote. She completed Search Console: domain verified, sitemap submitted (needed FULL url https://qutenote.com/sitemap.xml — relative "sitemap.xml" threw Invalid sitemap address), homepage indexing requested. REMAINING FOR HER: Bing Webmaster import, Instagram bio link, artist links, BetaList.
- GOTCHA: build 46 exportArchive said EXPORT FAILED/Redundant Binary on retry — the first chained attempt HAD uploaded (output swallowed). Check ASC before assuming an export failed.

## WEBSITE SEO ROUND Oct 19 (FIREFLY) — rank for "qute note"
- waitlist/robots.txt + waitlist/sitemap.xml (real files now; previously the DO catchall served app.html for them). JSON-LD Organization+WebSite in waitlist/index.html with alternateName "Qute Note"; new FAQ entry "Is it QuteNote or Qute Note?"; footer "© 2026 QuteNote (Qute Note)".
- REMINDER FOR EMERALD (pending her action): Google Search Console setup — add property qutenote.com (domain property via DNS TXT on Cloudflare, or URL-prefix via HTML file we can host), submit sitemap.xml, Request Indexing on the homepage. Also: put qutenote.com in her Instagram bio + ask featured artists to link. Brand term should rank within ~2 weeks of submission.

## BUILD 45 UPLOADED Oct 19 (FIREFLY) — FLOWER NUMBERS + HANDWRITING TAKE-OVER FIX
- NUMBERS: her botanical numerals 0-9 traced (make-number-sprites.py; chart had ghost numerals + a stray printed label under the 0 — STRONG threshold 140 segmentation + connected-component filter keeps only ink near the main glyph while preserving her dot accents). Sprites num-0..9.png in public/flower/ + api assets; render inline 0.85x bouquet height in both renderers; flowerGlyphs.json gained a numbers block.
- Long-word packing KEPT AS-IS (she rejected the florist two-rank proposal — likes the dense hippopotamus). Punctuation after a word NESTLES: FlowerText negative marginLeft -0.26*size; API drawFlowerText same pull before isMark pieces.
- HANDWRITING TAKE-OVER (her "redid but didn't update" bug): saveHandwritingProgress asAlternates now puts the FRESH capture as PRIMARY, old primary → alt1, old alt1 → alt2. Her broken d/h/u persist until she rewrites words once more — after this build it'll visibly update.
- YOUR WORDS section on handwriting overview: every capture word rendered in her live font (useHandwritingFontFace now takes a reloadKey + deletes the old FontFace before adding, so rewrites hot-swap), tap → one-word WordFlow pseudo-session (redo-<word>), finishing returns and clears.
- Flower Language sprite total now 53 files + glyphs.json in BOTH apps/web/public/flower and apps/api/assets/flower — keep synced.

## BUILD 44 UPLOADED Oct 19 (FIREFLY) — THE FLOWER LANGUAGE 🌷
- Her concept: every letter is a flower; each WORD gathers into a real tied-bouquet fan (her pick: option A), read left→right across the fan. NO capitals (case-insensitive). NO key screen anywhere — the ONLY decode is the button on the card in the app. Punctuation has its own botanical chart (period=acorn, comma=dandelion, full set incl. brackets/braces/slash). NUMBERS PENDING: she's sending a numbers chart next — until then numbers print as plain text inline. Apostrophes vanish inside words ("don't" bouquets as d-o-n-t; Decode shows real text).
- PIPELINE (vector tracing FAILED on this fine line art — glyphs shattered): pivoted to SPRITES. apps/web/flower-font/{make-sprites.py,trace.py,bouquet-proto.py}; sources in session scratchpad flower/ (alphabet.png from her Desktop chart "Minimalist Botanical Alphabet Chart.png", punct.jpg from Messages). make-sprites.py: luminance→alpha, ink #2E2440 baked in, trimmed PNGs → apps/web/public/flower/ (43 sprites, ~170KB) + src/lib/flowerGlyphs.json (sizes). Chart gotchas: row1 had TWO I columns (she said first one is real, berry sprig dropped); dandelion comma is super faint (threshold 225); {} braces merge in segmentation (split at ink valley).
- RENDER: src/lib/flower.ts (flowerPieces: words→bouquet stems with angle/scale, marks, plain passthrough) + components/FlowerText.tsx (SVG per bouquet, images rotated about stem bottom at tie point; grayscale filter). Layout: maxAngle = min(46, 10+n*7); scale jitter 0.86-1.0 deterministic; width 0.55+0.34*(n-1)*sin.
- APP: FLOWER pen "Flowers 🌷" (readable editor + "Blooms into bouquets" hint); ReviewStep renders FlowerText size 58; ProfilePage CardSheet decode toggle covers SECRET + FLOWER.
- API: FontChoice FLOWER pushed to prod; assets/flower/ sprites + src/lib/flower.ts (drawFlowerText: pdfkit translate/rotate/image, wraps in box) wired into admin-pdf. Verified: test PDF renders bouquets correctly.
- KEEP IN SYNC: layout constants exist in BOTH apps/web/src/lib/flower.ts and apps/api/src/lib/flower.ts.

## BUILD 43 UPLOADED Oct 19 (FIREFLY) — TEN-ITEM POLISH ROUND
- "Send a little somethin'" replaces "Send a card" (SendFlow title). Feed statuses: dashed pill GONE, 44px round heart button right of the bubble (HomePage).
- RULED PAPER: body::before fixed-position overlay draws ONE viewport-pinned 36px ruling (index.css); body bg transparent, html cream. TabBar = solid cream band + hairline top border (no more mismatched ruling seam). Title bands no longer need multiple-of-36 heights.
- EXTRA CARD $7.95: POST /stripe/buy-card (mode:payment, inline price_data 795¢, metadata kind:'extra_card') → webhook increments giftedCredits (checkout.session.completed branches on kind — subscription path unchanged). ReviewStep: outOfCards banner + ADD AN INDIVIDUAL CARD button, MAIL IT gated, refreshUser on window focus picks up the credit, /extra-card/success page (no auth) for the Stripe return. Physical goods = Stripe allowed, no Apple IAP needed.
- DRAFTS: lib/drafts.ts (localStorage, 20 max). SAVE DRAFT ghost button under MAIL IT → returns to Send start; drafts list card atop Send screen (resume via setNote+write step, ✕ delete); Settings → Drafts row (count) navigates to /send. Draft deleted on successful mail. Device-local only (fine for v1).
- CIPHER MARKS PER HOST: marks now one glyph PER HOST LETTER (cp = 0xE200 + hostIdx(a-z)*10 + vowelIdx*2 + level), positioned for the host's exact width AND height — o-arcs cap snugly (CAP_GAP=45 above host ink) instead of floating at fixed 780 (her "move the A down"). secretMetrics.ts now just exports SECRET_MARK_BASE. 290 glyphs. Transcription verified CORRECT against her milk-store sentence (the "double letters" were six real t's).
- Emoji in previews: filter grayscale(1) on note text (ReviewStep + ProfilePage CardSheet) — print is b/w.
- Pen picker: selected pill = SOLID purple fill, white text, no dashed borders anywhere (dashed read as multi-select).
- Handwriting: on the LAST word of a session the smudge-retry loop is skipped — save what passed and auto-return to the overview (navigate /handwriting replace). Mid-list retries unchanged.
- NEXT ROUND HEADLINER (promised): FLOWER LANGUAGE font — each letter a flower, words build bouquets. Need her 26 flower drawings photographed like the secret alphabet. Design questions open: bouquet layout vs linear, long words, vowel treatment.

## BUILD 42 UPLOADED Oct 19 (FIREFLY) — SECRET LANGUAGE POLISH + CROSSBAR SLICER FIX
- Her build-41 feedback (questions asked, answers logged): cipher letters closer together + NO spaces between words; weird line under the t; Secret pen chip too small/thin; handwriting letters cropped badly (h/t/m/e).
- FONT: proportional advances (SB=30 per side, was fixed 620 monospace), space glyph 220 but encodeSecret now emits ZERO-WIDTH SPACE (U+200B) between words so cipher runs together yet still wraps. Marks are per-WIDTH-CLASS now (cp = 0xE100 + (vowelIdx*2+level)*16 + class; standalone I/a moved to 0xE1A0/0xE1A1); generated src/lib/secretMetrics.ts (web + api copies) maps letter→class — REBUILD FONT AND BOTH METRICS VIA node secret-font/build-secret-font.mjs, never hand-edit.
- T STRAY LINE: the tracer had caught the photo edge as a flat 3px contour at the bottom of the t cell — deleted from contours.json. (Checked all letters: i's line and u's overline are REAL parts of her symbols, keep them.)
- PEN CHIP: SECRET preview size 24px + WebkitTextStroke 0.8px in SendFlow pen picker.
- SLICER: segment.ts flat-wide rule — a stroke wider than 1.5x the letter's share and nearly flat (height < max(14, 0.28w)) is a t/f crossbar invading the neighbor; it takes the knife FIRST even below the 0.7 spanning threshold. This was the horizontal line through her e and m. Her phone's saved letters stay chopped until she REWRITES THE TEN WORDS (told her).
- ACCOUNT GOTCHA: her phone is logged in as Emma@finalstraw.com (updatedAt current); emma@final.co's handwriting row is the stale Oct-12 single-letter era. Query the right one when debugging.
- DEBUG TOOLKIT: qlmanage SVG thumbnails silently truncate some font paths — rasterize via opentype.js path commands + PIL polygons instead (see session notes). Note table on prod is EMPTY so far (no completed sends) — don't panic when SELECTs return [].

## BUILD 41 UPLOADED Oct 18 (FIREFLY) — THE SECRET LANGUAGE (Emerald's cipher)
- Her hand-drawn 26-symbol alphabet is now a real font: apps/web/secret-font/ (trace.py pixel-boundary tracer + contours.json + build-secret-font.mjs) → public/fonts/QuteNoteSecret.otf (40 glyphs, monospace ADV=620). Rebuild with `node secret-font/build-secret-font.mjs` after editing contours.
- RULES (hers, confirmed): vowels a/e/i/u tuck UNDER the previous letter, o floats OVER; word-initial vowels attach UNDER/OVER the NEXT letter (amy: a under m); doubles stack outward max 2 deep then stand inline; standalone "I" and "a" words get tall diamond glyphs; numbers + punctuation stay normal. Encoder: apps/web/src/lib/secret.ts encodeSecret() — marks are zero-advance PUA combining glyphs (0xE100+vowel*2+level; I=0xE120, a=0xE121). Plain text is what's STORED; the cipher is only how it renders.
- IN APP: "Secret 🤫" pen in pens.ts (editor stays readable Fraunces + hint; preview renders cipher). Profile grid cards now OPEN (CardSheet in ProfilePage) — secret cards show cipher + DECODE THE SECRET toggle. Decoder key page /secret-key (SecretKeyPage: full alphabet, vowel rules, examples) linked from Settings → Secret language.
- PRINT: apps/api/assets/QuteNoteSecret.otf + src/lib/secret.ts (port); admin-pdf registers the OTF and prints encodeSecret(noteText) for SECRET cards (fallback italic if font missing). FontChoice SECRET pushed to prod DB.
- FUTURE ROUND (promised): camera/CV translation — point the camera at a secret card to decode it. Phase 1 (this build) is the in-app Decode button + key screen only.
- Prisma db push gotcha: root .env holds DATABASE_URL; `set -a && source ../../.env && set +a` before npx prisma db push from apps/api.

## BUILD 40 APPROVED Oct 18 (FIREFLY) — LETTER VARIATIONS + quality gate
- VARIATIONS ENGINE (her idea: real handwriting varies): lib/handwriting/variants.ts. Storage: alternates live beside primaries as "a#1"/"a#2" keys in the same glyphs JSON (no schema change). Word-session captures of an existing letter slide in as alternates (newest→#1, old #1→#2); Fix-one-letter REPLACES primary + clears the family. compileFont v5 emits alternates at PUA codepoints (0xE000 + charIdx*2 + n-1 via ALL_CHARS order) and SYNTHESIZES wobble (jitterStrokes: ±2.25° rotation, 0.965-1.035 scale, deterministic seed) for empty slots — every captured letter has 3 looks. varyHandwrittenText() cycles occurrences (primary→alt1→alt2) — applied in the ReviewStep back preview ONLY (editing surfaces stay plain text).
- QUALITY GATE in WordFlow.finishWord: a letter with ink pathLength < max(30, 0.3*word-median) never saves (the crumb-a bug); smudged letters trigger a quiet word repeat, MAX 3 attempts, then move on (Fix-one-letter is the catch-all). Her broken a + m need a one-time Fix-one-letter.
- Artist-list card thumbnails: tap = select that exact card + jump straight to write (one featured card stays on top).
- Tested: varyHandwrittenText cycling + PUA glyph emission verified via opentype.parse.

## BUILD 39 APPROVED Oct 18 (FIREFLY) — tweaks round
- compileFont v4: t ascender 0.8x (shorter than b/d/h/k/l), w/m band 1.1x x-height (wide letters read small). Auto-recompile via version gate.
- Handwriting overview celebrates at 67/67: "Yay — your handwriting is all learned! Go write a bunch of Qute Notes in it." BRAND RULE (memory'd): ALWAYS Qute, never Cute, in all copy.
- Dates: contact-birthday list is collapsible (caret) and already-added contacts drop off it (remainingBdays filter).
- NEW DATE TYPES (hers): Pet-iversary (heart), Tiny Triumphs (star), Sweet Traditions (gift), Seasonal Feels (sun) — optional "What's the occasion?" detail saved as "Type: detail" in the label. Pet gotcha day chip RETIRED; sober milestones explicitly declined.
- HALFPPY BIRTHDAY pushes: daily 15:00 UTC, same-day push 6 months from every annual Birthday date (day clamped for short months), via notifyBirthdays pref.

## BUILD 38 APPROVED Oct 18 (FIREFLY) — the hands-free handwriting round (7 items, question-loop protocol used)
- Word capture is HANDS-FREE: 1.5s pen-idle → auto-slice → save → next word (never interrupts, her call); slice preview UI removed (LetterPreview deleted — tsc -b in `npm run build` catches unused decls that plain `npx tsc --noEmit` passed!). Fix-one-letter remains the correction path.
- NEW WORD LIST (hers, poem-pair order): hug qt · zap fox · kid nap · cry jam · slow vibe (10 words, mostly 3-letter, full a-z verified; same uppercased for capitals).
- Slicer: cuts land at the INK VALLEY (thinnest column within ±18% of predicted boundary); crumb rescue v2 (pieces <22px glue to the letter whose substantial ink contains them — fixed her mangled d / "LooKs" k glyph).
- compileFont v3: resample 4px, relax x4, smoothing .9, streamline .72, thinning .35 — "doesn't look like it was written on a phone". FONT_COMPILER_VERSION=3 → saved fonts auto-recompile on next handwriting-page visit; best results = rewrite the words.
- "Got a good photo?\nMail it." two lines (whiteSpace pre-line on carousel titles).
- No-address dead-end now has TEXT THEM FOR THEIR ADDRESS (askForAddressByText in inviteText.ts → sms composer with qutenote.com/address link); shows whenever the send error mentions "address".

## BUILDS 36-37 APPROVED Oct 18 (FIREFLY rounds) + THE STALE-BUNDLE SAGA
- SAGA: Emerald's phone showed OLD screens on "build 34" (TestFlight lag/stale delivery; Apple attributed feedback to 34, screens matched 33). Resolution toolkit now shipped: visible "build N" stamp on Welcome + handwriting pages (VITE_BUILD env), self-healing guard in main.tsx (lib/buildGuard.ts compares App.getInfo().build to baked WEB_BUILD → cache-busting reload, one attempt per build). Verification greps must use BACKTICKS (oxc minifier emits template strings). MYSTERY BUILD 35 still unexplained (uploaded Oct 17 22:44 PDT by someone/something else, left unsubmitted — do NOT submit it; Emerald never answered the second-session question).
- BUILD 37 round (all her Oct 18 feedback, questions asked ONE AT A TIME per protocol):
  1. Slicer v2 (segment.ts): whole strokes stay with the letter where their centroid lives; only true spanning strokes get cut (>70% of a multi-letter cluster); orphan fragments from cuts hop to the nearest real ink (killed the "dot in the y" + chopped k/x). Tested sky/fox/qt/love.
  2. StatusBox: emojis hidden behind the thought-bubble tap (popup picker).
  3. Home carousel: lives forever; invite + photo never retire; first-card/alerts/handwriting cards retire when done (new lime TEACH YOUR HANDWRITING card).
  4. match-contacts: accepts up to 10k plain strings, server filters email-shaped (her thousands-of-contacts 400). Dates always shows "Checked N · M with birthdays". Her fresh install has NO contacts permission yet (iOS Settings shows no Contacts row) — next tap will prompt properly.
  5. SCHEDULING shipped: Note.mailAt added (prod pushed). POST /notes takes scheduledFor (event day, tomorrow..1yr) → mailAt = event - 6d (MAIL_LEAD, her 3-7 day window). submitDueNotes goes by mailAt (legacy: createdAt+2h). Counts the month it was MADE; DELETE /notes/:id cancels + refunds. GET /notes/scheduled + /notes/one/:id. UI: Send now / Schedule it + date + "mail is tricky" line on preview; Settings → Scheduled cards (count, edit via /send?edit=<id>, two-tap cancel). SCHEDULING REMINDER RETIRED.
- Protocol reminder: feedback questions go ONE AT A TIME before FIREFLY (see memory). Check feedback build attribution AND the on-screen build stamp before debugging "missing" features.

## BUILD 34 APPROVED Oct 17 (FIREFLY) — HANDWRITING, WORD EDITION (Emerald's idea)
- Capture is now WORD-based: 12 cute words (love/jam/sky/fox/hug/zip/bed/cow/vet/sun/rain/qt) cover a-z, same words UPPERCASED cover A-Z, number runs (2026/4813/5790), punctuation stays single-mark. WORD_SESSIONS in lib/handwriting/alphabet.ts.
- New lib/handwriting/segment.ts: slices a written word into letters — x-overlap clustering (i/j dots merge with stems), merge-smallest-gap when over-split, width-weighted stroke cutting when letters are connected (confidence 'low' → UI warns + suggests spacing). Tested: separated/dotted/connected all behave.
- toGlyphSpace preserves ink position relative to the WORD's baseline (real descender info from flow) → compileFont v2 unchanged.
- UI: wide ruled WordCanvas (640x280, baseline 200), slice-preview row (SVG minis per letter) with "Looks right →" / rewrite; Fix-one-letter sheet (tap any learned letter on the overview grid to redo it solo). Old per-letter session flow removed; AllDone celebration screen removed (overview shows ✓).
- Existing fonts/data unchanged until people re-teach with words; FONT_COMPILER_VERSION untouched.

## BUILD 33 APPROVED Oct 17 (FIREFLY) — Oct 17 feedback round
- Her 6 feedback items were ALL from build 31 (check the build relationship on betaFeedbackScreenshotSubmissions before re-fixing!). Status pencil + emoji picker were already in 32.
- New in 33: "Everything" master toggle on Notifications (all 5 prefs at once; turning anything on also calls enableReminders() on native so the device actually registers); Home's TURN ON ALERTS carousel card hides when remindersEnabled(); contacts flow does checkPermissions -> requestPermissions (never-asked phones now get Apple's popup; previously-denied get the Settings guidance).
- Status-tile-disappears was already correct (onPosted wired since build 27).
- WAITING ON EMERALD (on build 33): Apple sign-in retest ✓ done (works per her 10:05 Oct 16 note), push registration (Everything toggle → check DeviceToken table → fire live test push), contacts sync retry (new messages will say exactly what happened).

## BUILD 32 APPROVED Oct 16 (FIREFLY) — the Oct 16 feedback round (5 items)
- Social sign-in (Apple/Google) now routes through missing setup: lib/postAuthRoute.ts — isNew -> /signup/handle, else no address -> /signup/address, else no birthday -> /signup/birthday, else /home. Wired in LoginPage, SignUpPage, AuthContext (Google native deep link), GoogleAuthSuccessPage.
- Address forms: name= attrs added next to autoComplete so iOS offers contact-based address autofill in the webview (both AddressPage + SignupAddressPage; attrs existed, name/form context strengthened).
- StatusBox rework (Home + Profile): status is persistent — display mode (emoji + text + pencil), edit mode (torn-paper emoji picker incl. new thought-bubble entry in STATUS_EMOJI + text + SAVE). POST button gone.
- Contacts sync: real outcome surfacing — "Checked N contacts · M on QuteNote" on QTs, checked-count + no-birthdays guidance on Dates, and actual error text in failure states (next "didn't work" screenshot will say WHY). Root cause of her report still unconfirmed (likely zero matches or permission); plugin API usage verified against @capacitor-community/contacts v8 types. She never answered whether the permission popup appeared.
- Build 32 entitlements verified in pipeline (ENTITLEMENTS_OK gate in the build chain).
- Her 10:05 feedback confirmed Apple sign-in WORKS on build 31 (the 9:30 "still not working" was pre-update).

## BUILD 31 APPROVED Oct 16 (FIREFLY) — THE ENTITLEMENTS FIX + round items
- ROOT CAUSE FOUND: every build 1-30 shipped WITHOUT entitlements (applesignin + aps-environment) because the archive step used CODE_SIGNING_ALLOWED=NO and exportArchive never re-added them. This broke Apple sign-in (tester error 1000) and push-token registration (why Emerald's phone never registered). Pipeline now archives with local manual signing (cert "Apple Distribution", profile "QuteNote AppStore") — verified PRESENT in the shipped archive. Pipeline doc updated; never use CODE_SIGNING_ALLOWED=NO again.
- Round items in 31: Log out at the bottom of own Profile; "New here? Create an account" anchored under the social buttons on Log in (was below the fold — the "no way to create account after logout" report); Log in subtitle now "From your heart to their mailbox." (her copy).
- AFTER EMERALD UPDATES: have her retest Apple sign-in AND "Turn on alerts" (push). If a DeviceToken row finally appears, fire the live test push (scripts + ~/.appstoreconnect key).

## BUILD 30 APPROVED Oct 16 (FIREFLY): camera-permission crash fix (NSCameraUsageDescription was missing — Take Photo during card upload crashed since day one; photo-library path was fine). TestFlight feedback queue is EMPTY as of Oct 16.

## ROUND SHIPPED Oct 16 as BUILD 29 + WAITLIST WEBSITE (FIREFLY)
- NEW LOGO (lavender-heart wordmark, from her iPhone photo, background knocked out via PIL): /brand/qutenote_logo.png + /site/logo-ink.png + /site/qutenote_logo.png + waitlist assets. In app build 29 (Welcome/Login/SignUp/PickHandle) and website.
- WAITLIST WEBSITE (design/website-waitlist-oct16): static scroll-animated page now IS qutenote.com. Architecture: build:deploy = vite build, then waitlist-deploy.mjs renames React dist/index.html -> app.html and copies apps/web/waitlist/* into dist; DO static-site catchall_document switched to app.html (spec PUT via API). So / = waitlist, everything else (/login, /home, /admin, /i/..., OAuth returns) = React app. iOS uses plain `npm run build`, unaffected. Prerender machinery (prerender.mjs, entry-prerender.tsx) deleted.
- Forms: name+email (her call), POST JSON to /api/early-access with source waitlist-hero / waitlist-postcard. VERIFIED LIVE end-to-end (test row created + deleted).
- Design adaptations per its own README: crisp transparent logos swapped in (incl. generated inverse for footer), artist slot 2 = @bobbybealspresents real Horse art, og-image.png (1200x630) generated, Contact -> mailto. 3 artist cards still placeholders.
- FLAG FOR EMERALD: the waitlist page's Pricing section advertises launch pricing ($8.95/mo, $2.95 extra, free profile $0) per the design file — shipped as designed since a waitlist sells the future product, but she said "no pricing" for the CURRENT app; if she wants it off the waitlist too it's a 5-minute change.
- GOOGLE SHEET: "QuteNote Launch List" created in her Drive (sheet id 1_M_sCoGl2UoUewwRbisJKJgzx_NTe26PJDFuFKbhDOs); DB is source of truth; refresh on request.

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
2. cd apps/web && rm -rf node_modules/.vite node_modules/.vite-temp dist && VITE_API_BASE=https://qutenote.com/api VITE_BUILD=<N> npm run build && npx cap sync ios
   NOTE (Oct 18, corrected): env baking works fine — rolldown is just FAST (~270ms builds are real, not cached). When verifying baked values, the oxc minifier emits BACKTICK strings: grep for \`<N>\` (backticks), not "<N>". Verify every iOS build: grep -q 'qutenote.com/api' and the build number in dist/assets/index-*.js. Build 36 shipped CORRECTLY (stamp + stale-bundle guard + words flow all verified in its archive).
3. xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphoneos -destination 'generic/platform=iOS' -archivePath <path>.xcarchive CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="Apple Distribution" PROVISIONING_PROFILE_SPECIFIER="QuteNote AppStore" DEVELOPMENT_TEAM=97276PB95S archive
   (NEVER CODE_SIGNING_ALLOWED=NO — that strips the entitlements: builds 1-30 shipped WITHOUT applesignin + aps-environment, breaking Apple sign-in (error 1000) and push registration. Found+fixed Oct 16.)
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
