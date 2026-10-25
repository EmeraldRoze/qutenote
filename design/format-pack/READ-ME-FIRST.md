# QuteNote format pack

Four files. Drag all four into a Claude chat, then ask for a screen.
Everything in here is copied straight out of the live app on October 25, 2026,
so a screen built from these files is in the app's real format.

| File | What it is |
|---|---|
| `qutenote-format.css` | the real stylesheet: colours, fonts, the notebook paper, the die-cut stamp box, buttons, cards, the tab bar |
| `screen-template.html` | a working example screen. Open it in a browser to see the format, or hand it to Claude as the starting point |
| `design-rules.md` | the format written out in words, plus the rules that are easy to get wrong |
| `screen-inventory.md` | every screen in the app today and what is on it |

## The prompt to paste into Claude

> These four files are the design format for my iPhone app, QuteNote.
> Build me the **[name the screen]** screen in exactly this format.
> Use the classes from qutenote-format.css, follow design-rules.md, and put
> the whole stylesheet inside a `<style>` tag so the artifact renders on its
> own. Phone size, 390 by 844. Use her real artwork from the URLs in the CSS.

## Two things to know

**The artwork is live.** The pictures load from qutenote.com, so a mockup shows
your real painted emoji, your real paper texture and your real wax seal. If
Claude's preview ever shows blank boxes where art should be, it is blocking
outside images: upload the picture files to the chat instead and tell it to use
those.

**The button rule is still open.** The stylesheet has both the full-width baby
blue pill the app ships today (`qn-btn`) and the new stamp-outline button that
is only as wide as its words (`qn-stamp qn-btn-stamp`). Until we settle the
rule, tell Claude which one you want to see.
