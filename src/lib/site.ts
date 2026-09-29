/**
 * One place to edit the identity. Update these if the portal's title, short
 * name or tagline change — nothing else needs to touch them.
 */
export const org = {
  name: "Bangladesh Food Ministry Officers' Tour & Travel Portal",
  short: "Tour & Travel Portal",
  eyebrow: "Bangladesh · Food Ministry", // mono kicker above the wordmark
  monogram: "FM", // Food Ministry — legacy text mark, superseded by the crest
  tagline: "Tour planning, travel and welfare for Bangladesh Food Ministry officers",
};

export type Module = {
  code: string; // short service-style code
  slug: string; // route under /portal
  title: string;
  blurb: string;
};

/** The members-only modules (SRS Module B). Public pages only preview these. */
export const modules: Module[] = [
  {
    code: "ASN",
    slug: "association",
    title: "Association Information",
    blurb: "About the association and committee, official notices, and neutral election information.",
  },
  {
    code: "TRV",
    slug: "travel",
    title: "Travel & Tourism",
    blurb: "Tour programmes, travel plans, shared photos and the next-trip poll.",
  },
  {
    code: "WLF",
    slug: "welfare",
    title: "Welfare",
    blurb: "Support notices for colleagues in need and welfare matters.",
  },
  {
    code: "CND",
    slug: "condolence",
    title: "Condolence & Support",
    blurb: "Remembering colleagues and standing by their families.",
  },
  {
    code: "BLD",
    slug: "blood",
    title: "Blood Directory",
    blurb: "Volunteer donor officers, searchable by blood group.",
  },
];

export const getModule = (slug: string) => modules.find((m) => m.slug === slug);

export const BLOOD_GROUPS: string[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/**
 * Each notice board reads at a glance by a consistent colour + label, drawn from
 * the national palette: green = travel/association, red = welfare (urgent),
 * muted grey = condolence (somber).
 */
export const CATEGORY_META: Record<string, { label: string; accent: string; tint: string }> = {
  travel: { label: "Travel", accent: "#006A4E", tint: "rgba(0,106,78,0.10)" },
  welfare: { label: "Welfare", accent: "#D21034", tint: "rgba(210,16,52,0.10)" },
  condolence: { label: "Condolence", accent: "#5A6B63", tint: "rgba(90,107,99,0.14)" },
  association: { label: "Association", accent: "#0A3B2C", tint: "rgba(10,59,44,0.10)" },
};

export const categoryMeta = (c: string) =>
  CATEGORY_META[c] ?? { label: c, accent: "#0A3B2C", tint: "rgba(10,59,44,0.10)" };

/** Left-hand navigation inside the members area. */
export const memberNav = [
  { href: "/portal", label: "Dashboard" },
  ...modules.map((m) => ({ href: `/portal/${m.slug}`, label: m.title })),
  { href: "/portal/notifications", label: "Notifications" },
  { href: "/portal/profile", label: "My profile" },
];
