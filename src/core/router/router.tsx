import { AnchorHTMLAttributes, createContext, MouseEvent, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type NavigateOptions = { replace?: boolean };

type RouterContextValue = {
  pathname: string;
  search: string;
  navigate: (to: string, options?: NavigateOptions) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

function currentLocation() {
  return { pathname: window.location.pathname || '/', search: window.location.search };
}

export function RouterProvider({ children }: PropsWithChildren) {
  const [location, setLocation] = useState(currentLocation);

  useEffect(() => {
    const onPopState = () => setLocation(currentLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string, options?: NavigateOptions) => {
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === to) return;
    if (options?.replace) window.history.replaceState({}, '', to);
    else window.history.pushState({}, '', to);
    setLocation(currentLocation());
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const value = useMemo<RouterContextValue>(() => ({ ...location, navigate }), [location, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useAppRouter() {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useAppRouter must be used inside RouterProvider');
  return value;
}

export function AppLink({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useAppRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || !href || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
    event.preventDefault();
    navigate(href);
  }

  return <a {...props} href={href} onClick={handleClick} />;
}

export function Navigate({ to, replace = true }: { to: string; replace?: boolean }) {
  const { navigate } = useAppRouter();
  useEffect(() => navigate(to, { replace }), [navigate, replace, to]);
  return null;
}
