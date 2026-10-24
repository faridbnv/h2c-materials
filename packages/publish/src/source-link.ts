// Owner ruling R3 C (pack 16, 2026-10-22): a source whose URL is a path on the owner's own machine keeps that path in the
// data, for the owner's records, but the public site never shows it. The page credits the source by its title and says
// "private reference" instead of linking. Every public renderer (material pages, data parts) asks this one function, so a
// future local source is caught without a list of IDs.

export const PRIVATE_REFERENCE = 'private reference';

/** What a public page shows for a source's URL. */
export type PublicSourceLink =
  | { readonly kind: 'link'; readonly href: string }
  | { readonly kind: 'private'; readonly label: typeof PRIVATE_REFERENCE }
  | { readonly kind: 'none' };

// A path on a machine: POSIX absolute (/Users/..., /home/...), home-relative (~/...), file: URLs and Windows drive or UNC
// paths. Web addresses (http, https) are links; anything else that is not a path (a missing-value word) is no link.
const LOCAL = /^(?:\/|~\/|file:|[A-Za-z]:[\\/]|\\\\)/i;
const WEB = /^https?:\/\//i;

/** True when `url` names a file on someone's machine rather than a public address. */
export const isLocalPath = (url: string): boolean => LOCAL.test(url.trim());

export function publicSourceLink(url: string | null | undefined): PublicSourceLink {
  const u = (url ?? '').trim();
  if (isLocalPath(u)) return { kind: 'private', label: PRIVATE_REFERENCE };
  if (WEB.test(u)) return { kind: 'link', href: u };
  return { kind: 'none' };
}

/** The URL as the public may see it: unchanged for a web address, null for a local path or a non-address. */
export const publicUrl = (url: string | null | undefined): string | null => {
  const link = publicSourceLink(url);
  return link.kind === 'link' ? link.href : null;
};
