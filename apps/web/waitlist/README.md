# qutenote.com — waitlist homepage

Everything needed to put the new homepage live. It's a plain static site: no build step, no framework.

```
qutenote-site/
├── index.html      the page
├── css/style.css   all styles
├── js/main.js      scroll motion + waitlist form
└── assets/         logos, emoji, stamp and artist art (.webp)
```

## Put it live

Upload the whole `qutenote-site` folder's contents (not the folder itself) to the root of your host so `index.html` sits at qutenote.com/index.html. Netlify, Vercel, Cloudflare Pages, GitHub Pages and most regular web hosts all work with drag-and-drop or a simple upload. Keep the folder structure exactly as it is, since the page loads `css/`, `js/` and `assets/` by those paths.

To preview locally first, open a terminal in this folder and run `python3 -m http.server`, then visit http://localhost:8000.

## Before you share it: connect the waitlist

The two email forms (hero and the bottom postcard) show the "You're on the list" note, but **they don't save emails until you connect them**.

1. Create a form in your email tool and copy its form endpoint URL.
   - **Formspree** (simplest): create a form at formspree.io, copy the endpoint that looks like `https://formspree.io/f/abcdwxyz`, and forward or export signups to your email list from there.
   - **Mailchimp, Kit, Squarespace, Beehiiv, etc.**: their embedded forms usually block this kind of direct send. Either route through Formspree, or ask Claude to wire it to your specific tool.
2. Open `js/main.js`, find `const WAITLIST_ENDPOINT = '';` near the bottom, and paste the URL between the quotes.
3. Upload again and test with your own email.

Each form sends one field, `email`.

## Placeholders to swap before launch

- **Featured artists:** only the first card (Wildflower Morning by @ellis_tolsma) is real. The other four show `[Artist name]` and stand-in art. Swap in @bobbybealspresents and the rest, with their real card images, in the `#artists` section of `index.html`.
- **Footer links:** Privacy, Terms, Instagram and Contact point to placeholders (`#privacy`, etc.). Replace them with real URLs.
- **Share image:** `og:image` points to the logo. A 1200×630 PNG made for link previews will look better when the site is shared on Instagram stories, iMessage or Slack.
- **Logos:** the logos were cut from iPhone photos. A transparent PNG or SVG export from the original design file will be crisper.

## How the motion works

All scroll effects live in `js/main.js` and are driven by scroll position, not timers. They include the postmark landing on load, the postcards fanning out, the pinned phone in How it works (QTs, nudges, typing, mailbox), cards settling as they scroll in, the artist rack sliding sideways, the bleachers words lighting up, and the SEND stamp landing on the final postcard.

Anyone with "Reduce motion" turned on in their phone or computer settings gets a calm, static version of the page automatically.

## Fonts

Unbounded (headlines) and Anonymous Pro (body and buttons) load from Google Fonts, with no files to host.
