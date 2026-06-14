/**
 * Resume icon set — used by the `icon:<name>` extended-markdown syntax.
 *
 * Icons are rendered as `<span class="ri ri-<name>"></span>`. The actual glyph
 * is supplied via a CSS `mask-image` data-URI (see {@link getResumeIconCss}),
 * so the icon inherits the theme's accent/secondary color and survives print,
 * PDF and PNG export. Sanitization only needs to allow `span` + `class`.
 *
 * Path data is Lucide-style line art (24×24 viewBox, stroke based).
 */

const ICON_PATHS: Record<string, string> = {
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
  location:
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  school:
    '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  briefcase:
    '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  award:
    '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  pencil:
    '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  github:
    '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  linkedin:
    '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  calendar:
    '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  heart:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
};

/** Aliases map mujicv-style names to canonical icon keys. */
const ICON_ALIASES: Record<string, string> = {
  info: 'user',
  person: 'user',
  contact: 'user',
  email: 'mail',
  envelope: 'mail',
  tel: 'phone',
  mobile: 'phone',
  address: 'location',
  map: 'location',
  'map-pin': 'location',
  home: 'location',
  education: 'school',
  graduation: 'school',
  cap: 'school',
  work: 'briefcase',
  job: 'briefcase',
  experience: 'briefcase',
  trophy: 'award',
  medal: 'award',
  'fa-edit': 'pencil',
  edit: 'pencil',
  pen: 'pencil',
  blog: 'link',
  website: 'globe',
  site: 'globe',
  web: 'globe',
  url: 'link',
  github: 'github',
  repo: 'github',
  code: 'link',
  linkedin: 'linkedin',
  wechat: 'phone',
  qq: 'phone',
  date: 'calendar',
  time: 'calendar',
  birthday: 'calendar',
  skill: 'star',
  skills: 'star',
};

/** Resolve a raw icon token name to a canonical key, or null if unknown. */
export function resolveIconName(raw: string): string | null {
  const key = raw.toLowerCase().trim();
  if (ICON_PATHS[key]) return key;
  const alias = ICON_ALIASES[key];
  if (alias && ICON_PATHS[alias]) return alias;
  return null;
}

/** Canonical icon keys (for palette UI / insertion helpers). */
export const RESUME_ICON_KEYS = Object.keys(ICON_PATHS);

export function buildIconDataUri(iconKey: string): string {
  const inner = ICON_PATHS[iconKey];
  if (!inner) return '';
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    inner +
    '</svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/**
 * CSS rules that paint every known icon via `mask-image`. The glyph color is
 * driven by `--resume-icon-color` (defaults to the resume secondary text),
 * so a theme only needs to set that variable.
 */
export function getResumeIconCss(scope = '.synchire-resume-page'): string {
  const rules = RESUME_ICON_KEYS.map((key) => {
    const uri = buildIconDataUri(key);
    return `${scope} .ri-${key}{-webkit-mask-image:url("${uri}");mask-image:url("${uri}")}`;
  }).join('\n');
  return `${scope} .ri{
    display:inline-block;
    width:1.05em;
    height:1.05em;
    min-width:1.05em;
    margin-right:.32em;
    vertical-align:-0.18em;
    background-color:var(--resume-icon-color,#6b7280);
    -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
    -webkit-mask-position:left center;mask-position:left center;
    -webkit-mask-size:contain;mask-size:contain;
    flex-shrink:0;
  }
  ${rules}`;
}
