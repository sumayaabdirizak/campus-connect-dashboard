import sanitizeHtml from "sanitize-html";

const SANITIZE_OPTS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "h3",
    "span",
    "div",
    "pre",
    "code",
    "u",
    "s",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

/**
 * Server-side HTML sanitization for announcement bodies.
 * @param {string | null | undefined} html
 * @returns {string | null}
 */
export function sanitizeAnnouncementHtml(html) {
  if (html == null || typeof html !== "string") return null;
  const trimmed = html.trim();
  if (!trimmed) return null;
  return sanitizeHtml(trimmed, SANITIZE_OPTS);
}
