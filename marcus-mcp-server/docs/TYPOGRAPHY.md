# Marcus typography contract

Single source of truth bridging the live CSS in `src/utils.ts` and the Figma file
`R5vMGOG7s2fE9v4N0Z4GmC` ("Marcus"). When you change a font family, weight, or
size in code, change the matching variable / Text Style in Figma. When the design
team renames or retunes a Text Style, mirror it in code. **Both sides must move
in lockstep.**

## 1. Families

Loaded once in `src/utils.ts:18` from Google Fonts:

```
https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800
&family=Lora:ital,wght@0,400;0,500;1,400;1,500
&family=JetBrains+Mono:wght@400;500&display=swap
```

| Role     | Family          | CSS variable    | Figma variable       |
| -------- | --------------- | --------------- | -------------------- |
| Display  | Syne            | `--f-display`   | `font-family/display`|
| Body     | Lora            | `--f-body`      | `font-family/body`   |
| Mono     | JetBrains Mono  | `--f-mono`      | `font-family/mono`   |

All three families MUST be installed in any Figma desktop app rendering this
file (Figma → Manage Fonts → Add Google Fonts). The plugin cannot install fonts.

## 2. Type scale

The CSS uses `clamp()` for fluid sizing. Figma stores a single fixed value per
token (modes are not used). Both sides agree on the **resolved px at the 1440
design viewport**, which is also the cap of every clamp() except where noted.

| CSS token   | Figma variable     | Px @ 1440 | Where it caps                 |
| ----------- | ------------------ | --------- | ----------------------------- |
| `--tx-xs`   | `text-size/xs`     | 12        | clamp max                     |
| `--tx-sm`   | `text-size/sm`     | 14        | clamp max                     |
| `--tx-base` | `text-size/base`   | 17        | clamp max                     |
| `--tx-lg`   | `text-size/lg`     | 21        | clamp max                     |
| `--tx-xl`   | `text-size/xl`     | 30        | clamp max                     |
| `--tx-2xl`  | `text-size/2xl`    | 44        | clamp max                     |
| `--tx-3xl`  | `text-size/3xl`    | 72        | clamp max                     |

If a second design viewport is ever introduced, add a Figma variable mode
per viewport and re-resolve the clamp() at that viewport. Until then, **1440 is
the contract**.

## 3. Text Styles → CSS

Each Figma Text Style binds `fontSize` and `fontFamily` to the variables above
where the size matches. Off-scale styles (Wordmark 23, Pill 10, Inline-code 13)
do not bind `fontSize` and are listed as exceptions in §4.

| Text Style                  | Family         | Weight     | Size | LH    | Track | Case  | CSS selectors (utils.ts) |
| --------------------------- | -------------- | ---------- | ---- | ----- | ----- | ----- | ------------------------ |
| Display / H1 / 3xl          | Syne           | ExtraBold  | 72   | 110%  | -2%   | orig  | `.hero h1` (utils.ts:205-213) |
| Display / H1 / 2xl          | Syne           | Bold       | 44   | 110%  | -2%   | orig  | `.section h2`, `.prose h2`, inline H1s in `app.ts` (utils.ts:273-280, 443-454; app.ts:204, 221) |
| Display / Wordmark          | Syne           | SemiBold*  | 23   | 100%  | -1.5% | orig  | `.site-logo__word` (utils.ts:132-138) |
| Display / Button-primary    | Syne           | SemiBold   | 14   | 100%  | 1%    | orig  | `.cta--primary` (utils.ts:235-247) |
| Display / Button-secondary  | Syne           | Medium     | 14   | 100%  | 0     | orig  | `.cta--secondary` (utils.ts:248-259) |
| Display / Step-number       | Syne           | Bold       | 21   | 130%  | -1%   | orig  | `.step h3` (utils.ts:319-325) |
| Body / Default              | Lora           | Regular    | 17   | 170%  | 0     | orig  | `body`, `.section p`, `.connect-steps li`, `.privacy-block p`, `.prose p`, `.prose li` (utils.ts:65-77, 281-286, 341-347, 412, 467-471, 513-517) |
| Body / Small                | Lora           | Regular    | 14   | 170%  | 0     | orig  | `.step p` (utils.ts:326-330), tools-table cells `.tools-table` body (utils.ts:374-396), `.prose td` (utils.ts:569-575) |
| Body / Lede                 | Lora           | Italic     | 21   | 150%  | 0     | orig  | `.hero .lede`, `.prose > p:first-of-type`, `.prose blockquote p` (utils.ts:214-222, 433-441, 499-506) |
| Mono / Eyebrow              | JetBrains Mono | Regular    | 12   | 120%  | 10%   | UPPER | `.section__eyebrow`, `.step__num`, `.connect-steps li::before`, `.tools-table th`, `.prose th` (utils.ts:265-272, 311-318, 348-363, 380-390, 557-567) |
| Mono / Pill                 | JetBrains Mono | Regular    | 10   | 100%  | 10%   | UPPER | `.site-header__pill` (utils.ts:142-152) |
| Mono / Footer               | JetBrains Mono | Regular    | 12   | 100%  | 7%    | orig  | `.site-footer__item` (utils.ts:174-179) |
| Mono / Inline-code          | JetBrains Mono | Regular    | 13   | 100%  | 0     | orig  | `.connect-steps code`, `.tools-table td:first-child`, `.prose code` (utils.ts:365-372, 397-402, 535-542) |

\* Syne ships no real italic. The CSS at `utils.ts:134` uses `font-style: italic`,
which the browser synthesizes (oblique). Figma only loads true font styles, so
the Wordmark style sets `Syne SemiBold` (upright). This is a known visual
mismatch — see §4.

## 4. Off-scale exceptions

These sizes do **not** bind `text-size/*` because they fall between scale steps.
Document them here and revisit if the team decides to fold them into the scale.

| Style              | Size | Why off-scale | Code source |
| ------------------ | ---- | ------------- | ----------- |
| Display / Wordmark | 23   | Brand decision; Syne reads larger than Lora at the same px so the wordmark sits between sm and lg | `utils.ts:135` (`1.4375rem`) |
| Mono / Pill        | 10   | Sub-xs label; specifically smaller than the eyebrow scale | `utils.ts:144` (`.625rem`) |
| Mono / Inline-code | 13   | Slightly under `--tx-sm` so inline `<code>` reads inside body text without ascending | `utils.ts:367, 399, 537` (`.8rem`) |

Synthesized Wordmark italic (CSS only) is a separate exception — Figma displays
the real upright style.

## 5. How to change typography safely

1. **Adding a new size.** Add a Float variable to the `Marcus / Color`
   collection (yes, the existing collection — not a new one) named
   `text-size/<token>` with the resolved px value. Add the matching `--tx-<token>`
   to `utils.ts:39-45`. Update §2 of this file.
2. **Adding a new Text Style.** Create the style in Figma, bind `fontSize` and
   `fontFamily` to the variables. Add a row to §3 with the CSS selectors it
   represents. If no matching CSS exists yet, add it in `utils.ts` first.
3. **Renaming a Text Style.** Update §3 here and audit every binding via
   `figma.getStyleByIdAsync` so existing nodes pick up the new name.
4. **Changing a size.** Edit the variable's value in Figma AND the matching
   `clamp()` cap in `utils.ts:39-45`. The min and preferred can stay; the cap
   must equal the resolved px in §2.

## 6. Verification recipe

```bash
# Live screenshots @ 1440 viewport (compare against Figma frames 1:74, 19:4, 21:51, 140:34)
for p in / /vault/install\?state=test\&login=romacv /vault/conflict\?login=romacv /vault/error; do
  slug=$(echo "$p" | tr '/?&=' '____')
  npx -y playwright@latest screenshot --viewport-size=1440,720 \
    "https://marcus-mcp-server.r-df5.workers.dev$p" "/tmp/live$slug.png"
done
```

In Figma, run a quick read-only `use_figma` to confirm bindings:

```js
const styles = await figma.getLocalTextStylesAsync();
return styles.map(s => ({
  name: s.name, family: s.fontName.family, style: s.fontName.style, size: s.fontSize,
  bound: s.boundVariables ? Object.keys(s.boundVariables) : []
}));
```
