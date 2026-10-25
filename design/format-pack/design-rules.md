# QuteNote — the format, in words

Everything here matches the live app as of October 25, 2026 (palette 4, builds 53 and 54).
If a mockup and this document disagree, this document is right.

---

## The feeling

A page torn out of a nice notebook. Warm paper you can almost feel, faint ruled
lines running all the way down, deep oxblood ink instead of black, and real
painted artwork instead of system emoji. Postal, handmade, a little bit
stationery shop. Never slick, never corporate, never flat grey.

---

## Colour

| Colour | Hex | Where it goes |
|---|---|---|
| Paper | `#F1EBE3` | the background of every screen |
| Card white | `#FBF8F3` | cards and fields sitting on the paper |
| Oxblood ink | `#4A2424` | all text, all icons. Nothing in this app is ever black |
| Secondary ink | `#A07D7D` | subtitles and quiet text |
| Rosy brown | `#B4897A` | every outline, solid or dashed |
| Baby blue | `#BADAFF` | the fill of a main action button |
| Neon yellow | `#EEFC4E` | highlights: progress, pills, badges, the stamp heart |
| Dusty rose | `#9E625F` | the stamp centre, the active tab label |
| Blush | `#D5ADA3` | the outer edge of the Rose paper ombre, avatars |
| Light blush | `#E3D5CC` | back buttons, panels, switches |
| Light blue | `#E9EDF1` | soft note boxes, the default stamp panel |
| Ruled line | `#ACA8B8` | the notebook line, 1px every 36px |
| Divider | `#E6DED3` | hairlines between rows |
| Error | `#B4453C` | warmed red, never a fire-engine red |

Paper grain: `https://qutenote.com/brand/paper_texture.png`, tiled on every
background surface, including the title band and the tab bar.

---

## Type

- **Headlines: Unbounded, weight 300 only.** Never bold, never 400, never 600.
  Hierarchy comes from size, not weight. This is a hard rule.
- **Everything else: Anonymous Pro**, the typewriter font. Body text, labels,
  buttons, numbers.
- **Buttons: uppercase, weight 700, letter spacing 0.08em.** Buttons are verbs.
- Rough sizes: screen title 30px, section heading 20px, body 15 to 17px,
  captions 13px, button text 15px.

Writing pens inside a card (these are the choices a person writes with):
Your own handwriting, Fraunces italic, Sora, DM Mono, Rock Salt, Secret
Language (her hand-drawn cipher), Flowers (every letter is a flower that
gathers into a bouquet).

---

## The paper and the ruling

One 36px ruled grid is pinned behind the whole app. It does not scroll and it
does not care how tall anything is, so the lines stay even everywhere.

**The title band** is the clear space at the top of every screen, like the top
of a sheet of notebook paper: paper grain, no ruled lines, a 2px line along the
bottom. Its height is always a multiple of 36: 144, 186, 216, 252, 288, 324.

---

## The die-cut stamp box

The signature shape of the app. Real textured cardstock, punched perforations
around the edge, a shadow that follows every scallop, and a printed panel inset
into the paper. It wraps anything that matters: the status box, the tab bar
SEND button, the stamp on a card preview, signup fields.

In code it is `class="qn-stamp"` with `border: 10px solid transparent`, and the
panel colour comes from `--qn-panel`.

Two rules learned the hard way:
1. A small stamp must be **built big and shrunk as one piece**. Drawing it small
   makes the perforations look chunky.
2. Shrinking also shrinks its shadows, so divide the shadow sizes by however
   much you shrank it, or the edge disappears.

---

## Buttons

Today's app: a full-width baby blue pill, 56px tall, 28px corner radius, 2px
rosy brown outline.

**The new rule Emerald has asked for:** every button wears the stamp outline and
is only as wide as its text. No more full-width buttons. The exact edges of that
rule are still being decided (does it cover the quiet secondary buttons, the
little chips, and the settings rows). Both styles are in the stylesheet, so a
mockup can show either.

Anything tappable is at least 44px tall.

---

## Her artwork

Nothing uses system emoji. Every icon is a painting from her brand kit, served
from the live site so a mockup can use the real thing:

`https://qutenote.com/emoji/<name>.png`

bff, bff-live, blush, cake, calendar, camera, cloud, clover, coffee, crying,
envelope, flower, gift, heart, heart-sparkle, hearteyes, house, joy, laugh,
mailbox, mic, moon, music, party, pen, plane, popper, rainbow, smile, star,
sun, sunglasses, thought-bubble

Several of them are animated all by themselves (party, camera, mailbox,
heart-sparkle, thought-bubble, bff-live). Nothing needs to be scripted, they
just play.

Brand art: `/brand/wax_heart.png`, `/brand/wax_press.png` (the wax seal being
pressed), `/brand/postmark_stamp_heartless.png`, `/brand/send_stamp_heart.png`,
`/brand/qutenote_logo.png`, `/brand/paper_texture.png`, and her wax seal
alphabet at `/brand/wax/A.png` through `Z.png`.

---

## Motion

- The living ombre: colour drifts diagonally across a card forever, grain stays
  still. The goal in her words: "at any point when you look at the screen, you
  can see both colours."
- The twinkling cake: the candles actually flicker.
- Everything stills itself under Reduce Motion.

---

## Voice

- It is **Qute**, never Cute. Everywhere, no exceptions.
- Short, warm, a little cheeky. "Send a little somethin'." "Slide into their
  mailbox." "Feelin' Qute?" "Put it in writing, babe."
- Sentence case for sentences, uppercase only for buttons.
- No pricing language anywhere in the app right now.

---

## Things that are always true

- Nothing is black. Ink is `#4A2424`.
- Nothing is grey. Inactive things are tinted warm brown.
- Every outline is rosy brown.
- Headlines are never bold.
- The app scrolls up and down, never sideways.
- A new screen opens at the top.
