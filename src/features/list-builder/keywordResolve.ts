// Client-side port of src-tauri/src/db/seed.rs::resolve_keyword_id, used to
// show real keyword descriptions in UnitDetailModal without a round trip to
// the backend. Keep the two in sync -- see that file's own comments for why
// each rule exists (colon-truncation, trailing-digit-strip, `-x`/`-x-y`
// suffix fallback, the Hover: Air/Ground raw-prefix override).

const KEYWORD_ID_OVERRIDES: Record<string, string> = {
  coordinate: "coordinate-unit-name-type",
};

const RAW_PREFIX_OVERRIDES: Array<[string, string]> = [
  ["Hover: Air", "hover-air-x"],
  ["Hover: Ground", "hover-ground"],
];

export function resolveKeywordId(raw: string, knownIds: Set<string>): string | null {
  for (const [prefix, id] of RAW_PREFIX_OVERRIDES) {
    if (raw.startsWith(prefix) && knownIds.has(id)) return id;
  }

  const colonIdx = raw.indexOf(":");
  let base = (colonIdx === -1 ? raw : raw.slice(0, colonIdx)).trim();
  base = base.replace(/[0-9]+$/, "").trim();

  const slug = base
    .toLowerCase()
    .split("")
    .map((c) => (/[a-z0-9]/.test(c) ? c : "-"))
    .join("")
    .split("-")
    .filter(Boolean)
    .join("-");

  if (!slug) return null;

  const overrideId = KEYWORD_ID_OVERRIDES[slug];
  if (overrideId && knownIds.has(overrideId)) return overrideId;

  if (knownIds.has(slug)) return slug;
  const withX = `${slug}-x`;
  if (knownIds.has(withX)) return withX;
  const withXY = `${slug}-x-y`;
  if (knownIds.has(withXY)) return withXY;
  return null;
}
