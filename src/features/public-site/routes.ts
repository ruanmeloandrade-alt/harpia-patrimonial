export const publicRouteManifest = [
  '/',
  '/sobre',
  '/investimentos',
  '/leiloes',
  '/assessoria-juridica',
  '/arquitetura',
  '/imoveis',
  '/imoveis/:slug',
  '/vender',
  '/alugar',
  '/cliente',
] as const;

const exactPublicRoutes = new Set<string>(
  publicRouteManifest.filter((route) => route !== '/imoveis/:slug'),
);

export function normalizeFront02PublicPath(pathname: string) {
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

export function matchesFront02PublicRoute(pathname: string) {
  const normalized = normalizeFront02PublicPath(pathname);
  return exactPublicRoutes.has(normalized) || /^\/imoveis\/[^/]+$/.test(normalized);
}
