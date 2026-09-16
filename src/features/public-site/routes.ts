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

function normalizePath(pathname: string) {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '') || '/';
}

/**
 * Matcher para o AppRouter da Frente01 montar a experiência pública sem
 * duplicar regras de rota dinâmica. `/conta` continua fora daqui porque deve
 * permanecer protegida por `ClientRoute` e usar `Front02ClientAccountShell`.
 */
export function matchesFront02PublicRoute(pathname: string) {
  const path = normalizePath(pathname);
  if (/^\/imoveis\/[^/]+$/.test(path)) return true;
  return publicRouteManifest.some((route) => route !== '/imoveis/:slug' && route === path);
}
