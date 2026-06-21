const DEFAULT_GITHUB_PAGES_BASE_PATH = '/Cognac-Leopold-Croizet-site';

export const PUBLIC_ORIGIN = 'https://cognac-leopold-croizet.com';
export const GITHUB_PAGES_BASE_PATH = DEFAULT_GITHUB_PAGES_BASE_PATH;
export const DEPLOY_BASE_PATH = resolveDeployBasePath();

export function withDeployBase(route = '/') {
  const normalizedRoute = String(route || '/').startsWith('/') ? String(route || '/') : `/${route}`;
  return DEPLOY_BASE_PATH ? `${DEPLOY_BASE_PATH}${normalizedRoute}` : normalizedRoute;
}

export function normalizeLegacyDeployBase(value) {
  if (!value || DEPLOY_BASE_PATH === GITHUB_PAGES_BASE_PATH) return value;

  const replacement = DEPLOY_BASE_PATH;
  const escapedReplacement = replacement.replace(/\//g, '\\/');
  const legacy = escapeRegExp(GITHUB_PAGES_BASE_PATH);
  const escapedLegacy = escapeRegExp(GITHUB_PAGES_BASE_PATH.replace(/\//g, '\\/'));
  const origin = escapeRegExp(PUBLIC_ORIGIN);

  return String(value)
    .replace(new RegExp(`${origin}${legacy}(?=[/"'?#]|$)`, 'g'), `${PUBLIC_ORIGIN}${replacement}`)
    .replace(new RegExp(`${legacy}(?=[/"'?#]|$)`, 'g'), replacement)
    .replace(new RegExp(`${escapedLegacy}(?=\\\\/|["'?#]|$)`, 'g'), escapedReplacement);
}

export function stripDeployBaseForLocalPath(value) {
  let path = String(value || '');
  for (const base of [GITHUB_PAGES_BASE_PATH, DEPLOY_BASE_PATH]) {
    if (!base) continue;
    if (path === base) path = '/';
    if (path.startsWith(`${base}/`)) path = path.slice(base.length);
  }
  return path || '/';
}

function resolveDeployBasePath() {
  const explicit = process.env.DEPLOY_BASE_PATH ?? process.env.SITE_DEPLOY_BASE ?? process.env.PUBLIC_BASE_PATH;
  if (explicit !== undefined) return normalizeDeployBasePath(explicit);

  const target = String(process.env.DEPLOY_TARGET || process.env.SITE_DEPLOY_TARGET || '').toLowerCase();
  if (target === 'github' || target === 'github-pages' || target === 'gh-pages' || target === 'pages') {
    return GITHUB_PAGES_BASE_PATH;
  }
  return '';
}

function normalizeDeployBasePath(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === '/') return '';
  const path = trimmed.replace(/^https?:\/\/[^/]+/i, '');
  return `/${path.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
