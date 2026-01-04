export const SITE_NAME = "Prod Ideator";

export const SITE_DESCRIPTION =
  "Create projects and organize items across lists (with drag and drop).";

export function formatPageTitle(pageTitle?: string) {
  const t = (pageTitle ?? "").trim();
  if (!t) return SITE_NAME;
  return `${t} · ${SITE_NAME}`;
}



