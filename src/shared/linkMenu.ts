/**
 * The right-click "Copy link address" item on links in the app.
 *
 * Named links show "HubSpot" instead of the raw URL, so selecting the text
 * copies the name, not the address. The window's context menu offers one item,
 * and only on a link this module says is safe to hand to the clipboard.
 *
 * Pure and import-free, so tests load it directly.
 */

/** The label until the renderer sends the one in the owner's language. */
export const DEFAULT_COPY_LINK_LABEL = 'Copy link address';

/** Longest label the main process accepts from the renderer. */
const MAX_LABEL_CHARS = 60;

/**
 * The text "Copy link address" puts on the clipboard for a right-clicked link,
 * or null when the menu should not show at all.
 *
 * Only web and mail links qualify: the same http(s) rule the window's open
 * handler follows, plus mailto. A `file:`, `javascript:` or app scheme link is
 * never offered. A mail link copies the plain address ("pam@example.com"),
 * which is what an owner pastes into a To field; the `mailto:` prefix and any
 * `?subject=` part are dropped.
 */
export function copyableLinkText(linkURL: unknown): string | null {
  if (typeof linkURL !== 'string') return null;
  const url = linkURL.trim();
  if (/^https?:\/\/\S+$/i.test(url)) return url;
  const mail = /^mailto:([^?#]+)/i.exec(url);
  if (!mail) return null;
  let address: string;
  try {
    address = decodeURIComponent(mail[1]).trim();
  } catch {
    return null;
  }
  return address && !/[\s<>]/.test(address) ? address : null;
}

/**
 * A menu label sent by the renderer, or null when it is not one: a non-empty
 * string with no control characters, at most 60 characters. Anything else
 * keeps the label the main process already has.
 */
export function cleanMenuLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const label = raw.trim();
  if (!label || label.length > MAX_LABEL_CHARS) return null;
  if (/[\u0000-\u001f\u007f]/.test(label)) return null;
  return label;
}
