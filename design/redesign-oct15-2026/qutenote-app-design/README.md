# QuteNote app: full design update

This folder is the approved redesign of the QuteNote iOS app: 18 screens covering onboarding, the five tabs, settings, dates and the four-step send flow. Use it to update the app's existing screens and build the new ones.

## What's in the folder

- `index.html`: every screen on one page. Open it in a browser for the overview, then click a screen name to open it full size.
- `screens/`: one HTML file per screen. These are the visual reference for layout, copy, colors, sizes and spacing. Don't ship them; rebuild each screen with the app's own framework and components.
- `assets/`: every image, ready to use as-is. Don't redraw them.
  - `brand/`: the logo (heart in the Q is #A78BC7) and the postmark heart stamp.
  - `emoji/`: the paper-collage emoji, all with transparent backgrounds.
  - `stamps/`: the four collectible stamps, with their perforated edges.
  - `artist-cards/`: this month's artist postcards.
- `tokens.json`: colors, fonts, type sizes, radii, spacing and component rules.

## How to use this (instructions for Claude Code)

1. Open `index.html` and read this whole README before changing anything.
2. Copy `assets/` into the app's asset catalog, keeping the file names.
3. Bundle the fonts if the app doesn't have them yet: Unbounded, Anonymous Pro, Fraunces, Sora, DM Mono and Rock Salt. All are free on Google Fonts.
4. Add the values in `tokens.json` to the app's theme so colors and sizes aren't hard-coded.
5. Build the shared pieces first (see "Shared building blocks"), then go screen by screen in the order of the table below.
6. For every screen, use the copy in its HTML file word for word. The copy has been edited by hand, so the HTML is the source of truth, not this README.
7. Keep existing app logic (auth, payments, printing, data) and change the UI around it. If a screen needs data or an action the app doesn't support yet, leave a clear TODO; don't invent backend behavior. Ask before removing any existing feature that has no place in these designs.

## Screens

| File | Screen | Status |
|---|---|---|
| `01-welcome` | Welcome | Update |
| `02-create-account` | Create account (email sign-up) | Update |
| `03-pick-handle-google-apple` | Pick your handle (only after Apple/Google sign-up) | New |
| `04-signup-address` | Sign-up: address | Update |
| `05-signup-birthday` | Sign-up: birthday | New |
| `06-log-in` | Log in | Update |
| `10-home` | Home tab (brand-new member state) | Update |
| `11-send-pick-a-card` | Send tab = send step 1, pick a card | Update |
| `12-qts` | QTs tab (friends) | Update |
| `13-dates` | Dates tab | Update |
| `14-add-a-date` | Add a date | Update |
| `15-profile` | Profile tab | Update |
| `16-settings` | Settings | Update |
| `17-account` | Account | Update |
| `18-your-address` | Your address (from Settings or Profile) | Update |
| `20-send-step2-who` | Send step 2: who it's for | New |
| `21-send-step3-write` | Send step 3: write your note | Update |
| `22-send-step4-preview` | Send step 4: preview and mail | New |

## Shared building blocks

### Notebook-paper background (every screen)

- **Paper:** the background is cream `#FBF8F2` ruled with a 1px `#E7E1EF` line every 36px.
- **One ruling for the whole screen:** draw it as one continuous background behind the entire screen, including behind the tab bar. Don't draw lines per section; that's what made the spacing uneven before.
- **Title band:** the top of every screen is a clear band with no lines, like the header space on school notebook paper. A 2px `#D9CFEC` rule marks where the band ends.
  - Its height is always a multiple of 36 (144, 216, 252, 288 or 324), so the ruled lines below keep their rhythm.
  - Titles and their emoji sit vertically centered in the band, below the status bar (54px top padding).
- **Cards:** white cards sit on top of the lines and hide them.

### Tab bar (Home, QTs, Send, Dates, Profile)

- **Order:** Home (house emoji), QTs (bunny-ears pair), the raised SEND stamp in the center, Dates (calendar emoji), Profile (sunglasses emoji).
- **SEND button:** a tilted postage stamp, not a normal tab icon. It has a dashed ultraviolet border on a `#EEE8FB` frame, an ultraviolet center, a lime heart with white wave lines, and the word SEND.
- **States:** the active tab is full color with an ultraviolet label. Inactive tabs are grayscale at 55% opacity with gray labels.
- **Background:** the bar has no top divider line and the same ruled paper behind it.
- **Where it hides:** onboarding, Settings, Account, Your address, Add a date and send steps 2 to 4.

### Components

- **Primary button:** a full-width ultraviolet `#5A32D6` pill, 56px tall, with white bold ALL CAPS Anonymous Pro text. Every primary button in the app is this purple.
- **Back button:** a 44px lavender circle with a chevron.
- **Selected state:** a dashed 2px lilac `#BE8EF5` border with a `#F3EEFF` fill. It marks the picked pen, date type, recipient and send time. Unselected options are white with a thin `#E3DCF2` border.
- **Forms:** fields are grouped in one white card with thin dividers. Each field has a small label above it, then the field itself.
- **Switches:** on/off switches turn lime when on.
- **Lime:** only for small accents like pills, badges and switches, never headings.
- **Type:**
  - **Headlines:** Unbounded 26px on onboarding and sub-screens, 28px on the main tabs, 50px on Welcome.
  - **Everything else:** Anonymous Pro. Body text is 15px, fields 16px, labels 13px and buttons 15px.
- **Touch targets:** at least 44px.

## Flows

**Onboarding**
- **Email sign-up:** Welcome → SIGN UP → Create account → Address → Birthday → Home.
- **Apple or Google sign-up:** Welcome → SIGN UP → tap Apple or Google → Pick your handle → Address → Birthday → Home. Apple and Google don't provide a username, so this one extra step collects it.
- **Returning members:** Welcome → LOG IN → Log in → Home. Log in only signs into an existing account; it never creates one.

**Sending a card (4 steps)**
1. **Pick a card:** the Send tab. Tapping WRITE ON IT continues.
2. **Who's it for?** Pick a QT, or "Someone not on QuteNote yet?", which texts them for their address.
3. **Write your note.**
4. **Preview and mail.** MAIL IT sends and returns to Home.

If someone starts from a person instead (WRITE next to a birthday, replying to a status), the recipient is already known, so skip step 2 and count the flow as 3 steps.

**Dates:** the Dates tab → any + button or quick-add chip → Add a date → SAVE DATE → back to Dates.

## Screen notes

These cover behavior the static HTML can't show.

- **Welcome:**
  - The logo sits in the top band.
  - "Send something real.", the postmark heart stamp and the tagline sit together in the middle of the screen, on the ruled lines.
  - The stamp floats beside "Send" without changing the line spacing.
  - LOG IN and SIGN UP are pinned to the bottom.
- **Create account:** Apple and Google are round 68px buttons, both white with an ink outline. Apple uses the black logo; follow Apple's and Google's logo guidelines. The fields are name, username (with a purple @), email and password (with SHOW). Birthday is not on this screen.
- **Pick your handle:** pre-fill a suggestion from their name. Check availability live and show the lime "Available" tag. Offer three alternatives as tappable chips.
- **Address:** use address autocomplete and verification (AVS). The privacy note must stay.
- **Birthday:**
  - Month, day and year are picked on a scroll wheel, with the chosen row highlighted.
  - SAVE MY BIRTHDAY, plus "Skip for now".
- **Log in:** the fields autofill a saved username and password, so Face ID works. "Forgot password?" opens the reset flow, which isn't designed yet.
- **Home (new member):**
  - **Status box:** always at the top, below the greeting, with a 60-character limit and a POST button. It's the main way to set a status, and posts show on friends' feeds.
  - **Carousel:** four swipeable offer cards, with dots that follow the swipe.
  - **Get set up:** shows progress out of 5. The address step counts as done at sign-up. Each tile drops off once its task is done.
  - **From your QTs:** shows the mailbox empty state until the person has friends. After that it becomes the feed of birthdays, statuses and sends.
- **Send (step 1):**
  - **Featured panel:** the big panel swipes through the selected artist's three cards, with dots.
  - **Switching artists:** tapping an artist's name or one of their small cards loads that artist into the panel at their first card and outlines their row.
  - **Labels:** the panel says "Featured this month" for the featured artist and "October artist" for the others.
  - **Handles:** write artist handles exactly as shown (@ellis_tolsma, @bobbybealspresents) so people can find them on Instagram.
  - **Upload:** "Upload your own photo" sits above the artist list.
- **QTs:** the invite box comes first, then search, then friends sorted by whose birthday is next. Birthdays within a week get a lime pill.
- **Dates:** the reminders switch says "We'll buzz you 7 days before." The empty state shows the cake. The page also has quick-add chips and "Pull birthdays from contacts".
- **Add a date:**
  - **Who's it for:** one search field that takes a QT or any typed name.
  - **Type chips:** Birthday (cake), Anniversary (party face), Hard day (crying face) and Other (thought bubble).
  - **Other:** choosing it reveals a "What's the occasion?" text field.
  - **Date:** month and day on a scroll wheel.
  - **Every year:** a switch, on by default.
- **Profile:**
  - **Header:** the postmark heart stamp with the person's initials inside the lime heart. People with one name show one letter.
  - **Header buttons:** the + on the heart's corner picks a status emoji, and the round QR button shows their code.
  - **Status:** an editable status box.
  - **Sent / Received:** shown as a 3-column photo grid of real cards, like Instagram.
  - **Cards left:** "Left this month" with the renewal date and the extra-card price.
  - **Stamp collection:** shows the collected stamp images.
  - **Payment:** lives in Settings, not here.
- **Settings:** Account, Membership, Payment methods, Scheduled cards, Your address, Privacy, Notifications, Handwriting, Get help, then Log out. Billing history goes inside Payment methods.
- **Account:** every field is editable. The + on the photo picks an emoji or a photo. Delete account is required by Apple.
- **Write your note (step 3):**
  - **Note card:** the text wraps around the stamp in the card's top-right corner and never sits under it. In UIKit/SwiftUI, use `textContainer.exclusionPaths` for the stamp's rect.
  - **Limit:** 450 characters, with a live count.
  - **I NEED WORDS:** opens prompt chips that add a starter line to the note. Occasion lives in these prompts; there's no separate occasion step.
  - **Pens:** "Your handwriting" (the person's own handwriting font), Fraunces Italic, Sora, DM Mono and Rock Salt. Each pen has its own note size: 19, 23, 19, 17 and 16px.
  - **PREVIEW MY CARD:** purple.
- **Preview (step 4):**
  - **Front/Back switch:** the back shows the note in the chosen pen, the stamp, and "To: name" with "address hidden".
  - **Details:** "When should it mail?" (Send now / Schedule it) and "1 of your 2 this month".
  - **Edit window:** sent cards can be edited for 2 hours.

## Emoji map

| File | Used on |
|---|---|
| `house_emoji` | Home tab icon, address step, Profile address row |
| `bff_emoji` | QTs tab icon, Find your people, invite boxes, Pick your handle, step 2 |
| `calendar_emoji` | Dates tab icon, Add a date |
| `sunglasses_emoji` | Profile tab icon |
| `heart_sparkle_emoji` | Home carousel, Log in |
| `cake_emoji` | Birthday step, Add your birthday tile, Dates empty state, Birthday chip |
| `party_emoji` | Anniversary chip |
| `crying_emoji` | Hard day chip |
| `thought_bubble_emoji` | Status boxes, Set your status tile, Other chip, I NEED WORDS |
| `pen_emoji` | Write your note, Handwriting tile and button |
| `mailbox_emoji` | Create account, Home feed empty state, alerts card, Birthday note, Preview |
| `camera_emoji` | Upload your own photo |

## Placeholder content

The names (Grayson, Maya, Rafi and others), dates, address suggestions and the sample note are mockup content. Wire them to real data.

## Before launch

- **Artist cards:** several files in `artist-cards/` came from Instagram screenshots and are too small to print. A 4x6 postcard needs about 1800 x 1200 pixels. Get full-size files from @ellis_tolsma and @bobbybealspresents before these go live.
- **Stamps:** the stamp images were cut from a screenshot. Swap in full-size exports for sharper results.
- **Not designed yet:** the password reset flow, Payment methods and billing history, Membership, Scheduled cards, Privacy, Notifications, the handwriting setup flow, the person/profile view for a friend, the "Someone not on QuteNote yet" text-invite flow, and the post-send confirmation.
