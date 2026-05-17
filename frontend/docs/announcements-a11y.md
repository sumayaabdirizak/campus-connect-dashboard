# Announcements Accessibility Notes

Reference for keyboard-only and assistive-technology (AT) users on the announcements page. Targets WCAG 2.2 Level AA + WAI-ARIA Authoring Practices.

## Page landmarks

| Region | Element | Notes |
|---|---|---|
| Feed | `<div role="feed">` | Wraps the visible announcement list. Each item is wrapped in `<article aria-labelledby aria-posinset aria-setsize>`. |
| Sidebar | `<aside aria-label>` | Two `<section aria-labelledby>` cards: Unread + Pinned, each with an `<h2>`. |
| Tabs | `<div role="tablist">` | All / Pinned filter; `aria-selected` reflects current tab. |
| Loading | `<div role="status" aria-live="polite">` | Announces "Loading announcements" while skeletons render. |
| Live status | `<div role="status" aria-live="polite" class="sr-only">` | Announces unread-count changes (e.g. "3 unread announcements"). |

## Keyboard map

| Key | Context | Action |
|---|---|---|
| `Tab` / `Shift+Tab` | Anywhere | Standard focus traversal. |
| `Enter` / `Space` | Card with `readTrigger="click"` | Marks the focused unread card as read. |
| `Enter` | Show more | Loads next 10 cards. |
| `Esc` | Lightbox | Closes the gallery and returns focus to the trigger thumbnail. |
| `ArrowLeft` | Lightbox (LTR) | Previous image. |
| `ArrowRight` | Lightbox (LTR) | Next image. |
| `ArrowLeft` / `ArrowRight` | Lightbox (RTL) | Mirrored: arrows follow visual direction. |
| `Tab` | Lightbox | Trapped — cycles between Close → Prev → Next → Thumbnails → back to Close. |
| `Enter` / `Space` | Read more | Expands or collapses long content; `aria-expanded` reflects state. |

## Hit targets

All interactive controls meet WCAG 2.2 SC 2.5.8 (Target Size — Minimum, 24×24 CSS px). Touch targets in the card kebab menu, lightbox controls, and image-picker remove buttons are 44×44 to comfortably exceed iOS/Android guidance.

## Color independence (SC 1.4.1)

Priority is conveyed by **icon + text + color**, never color alone:

- `Urgent` — red border + `<Icons.warning>` icon + the literal word "Urgent" inside the badge.
- `Important` — amber border + `<Icons.info>` icon + the literal word "Important".
- The badge uses `role="img" aria-label="<priority> priority"`.

The unread state is also conveyed via `data-read="false"` and a screen-reader-only "Unread announcement" string inside each card.

## Screen-reader announcements

| Event | Announcement source | Behavior |
|---|---|---|
| New unread total | `<div role="status" aria-live="polite">` in feed | Announces "N unread announcement(s)" on every change. |
| Card mark-read (viewport) | IntersectionObserver-driven; the badge updates and the live region speaks the new count. | |
| Card mark-read (click) | `Enter`/`Space` triggers same flow. | |
| Lightbox open | Dialog has `aria-modal aria-label` set to the current image's alt text. | Image counter is `aria-live="polite"`. |
| Audience preview | `aria-live="polite"` on the count and sample so deans can hear the reach update as they tweak targeting. | |

## Alt text

The image picker requires an alt-text field per uploaded image (see [image-picker.tsx](../src/features/announcements/components/image-picker.tsx)). Empty alt is supported but only when the image is purely decorative — the help text under the input states this. Alt text is persisted on `AnnouncementAttachment.altText` and surfaced in `<Image alt>` everywhere downstream (card preview, lightbox main image, thumbnail buttons via `aria-label`).

## RTL / Arabic

- Markdown content renders inside a `dir="rtl"` wrapper when the locale is Arabic.
- Spacing uses logical Tailwind utilities (`ps-*`/`pe-*`/`ms-*`/`me-*`/`start-*`) so layout flips automatically.
- Lightbox arrow keys mirror direction so a RTL user pressing `←` continues to mean "next" visually.
- Filter pill underline is centered (`left-1/2 -translate-x-1/2`) so it does not need flipping.

## Plain-language hint (SC 3.1.5)

The create dialog computes a Flesch reading-ease score on the message field and surfaces it inline:

- 80+ "Easy to read" — green
- 60–79 "Plain language" — green
- 40–59 "Moderate" — amber
- <40 "Complex — consider simplifying" — red

The hint sits in `aria-live="polite"` so it does not interrupt typing.

## Audience preview

The "Who will see this?" panel in step 2 of the create dialog calls `GET /announcements/preview-recipients` and surfaces a count + sample of names. Used by deans to confirm targeting before publishing.

## Manual smoke test

1. Open the page, `Tab` from the address bar — focus should land on the Create button (when authorized), then Tabs, then Search, then Filters, then the first card.
2. With a screen reader on, navigate through the feed — each card should be read as `article: <title> · 1 of N`.
3. Open a card with images, press `Enter` on a thumbnail — focus moves into the lightbox; `Tab` cycles within the lightbox; `Esc` closes and returns focus to the original thumbnail.
4. As a publisher, open the create dialog, type into Message — readability hint appears; switch to step 2 — audience preview shows count and names.
5. Switch UI locale to `ar` — verify content text direction, badge mirroring, lightbox arrow direction.
