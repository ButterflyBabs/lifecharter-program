// Vimeo videos are stored as "123456789", or "123456789:abcdef1234" for unlisted videos with a privacy hash.

/** Accepts a Vimeo page URL, player URL or plain ID and returns the stored form, or null if it isn't a Vimeo video. */
export function parseVimeo(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^\d+(:[a-z0-9]+)?$/i.test(s)) return s;
  const player = s.match(/player\.vimeo\.com\/video\/(\d+)(?:.*[?&]h=([a-z0-9]+))?/i);
  if (player) return player[2] ? `${player[1]}:${player[2]}` : player[1];
  const page = s.match(/vimeo\.com\/(?:.*\/)?(\d+)(?:\/([a-z0-9]+))?/i);
  if (page) return page[2] ? `${page[1]}:${page[2]}` : page[1];
  return null;
}

export function vimeoEmbedUrl(stored: string) {
  const [id, hash] = stored.split(":");
  const params = new URLSearchParams({ title: "0", byline: "0", portrait: "0" });
  if (hash) params.set("h", hash);
  return `https://player.vimeo.com/video/${id}?${params}`;
}
