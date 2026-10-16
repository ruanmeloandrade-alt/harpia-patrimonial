/** Header/footer are read from the standard landing page, never redesigned here.
 * Shadow roots retain the landing CSS without changing the approved property body. */
type LandingTemplate = { header: Element; footer: Element; css: string; fonts: string; htmlClass: string; bodyClass: string };
let pendingTemplate: Promise<LandingTemplate> | undefined;
const hostCSS = ':host{all:initial;display:block;width:100%;font:normal 16px/normal "Times New Roman",serif;line-height:normal;color:#000;text-align:start;box-sizing:border-box}.hp-landing-html{display:block}.hp-landing-body{display:flow-root}';

function absoluteCSS(css: string, base: string): string {
  return css.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi, (original, _quote: string, value: string) => {
    if (/^(data:|blob:|#)/i.test(value)) return original;
    return `url("${new URL(value, base).href}")`;
  });
}
function adaptCSS(css: string): { css: string; fonts: string } {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const fonts: string[] = [];
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.FONT_FACE_RULE) fonts.push(rule.cssText);
      if (rule instanceof CSSStyleRule) {
        rule.selectorText = rule.selectorText
          .replace(/:root\b/g, '.hp-landing-html')
          .replace(/(^|[\s>+~,(:])html(?=[\s>+~,.#[:)]|$)/g, '$1.hp-landing-html')
          .replace(/(^|[\s>+~,(:])body(?=[\s>+~,.#[:)]|$)/g, '$1.hp-landing-body');
      }
      if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
    }
  };
  walk(sheet.cssRules);
  return { css: Array.from(sheet.cssRules, rule => rule.cssText).join('\n'), fonts: fonts.join('\n') };
}
async function readText(url: string): Promise<string> {
  const response = await fetch(url, { cache: 'no-cache', credentials: 'same-origin', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Landing page HTTP ${response.status}`);
  return response.text();
}
function getTemplate(): Promise<LandingTemplate> {
  if (!pendingTemplate) pendingTemplate = (async () => {
    const homepage = new URL('/', location.origin);
    const doc = new DOMParser().parseFromString(await readText(homepage.href), 'text/html');
    const header = doc.querySelector('body > header'), footer = doc.querySelector('footer.site-footer');
    if (!header || !footer) throw new Error('Cabeçalho/rodapé padrão não encontrados.');
    const styles = await Promise.all(Array.from(doc.head.querySelectorAll('style,link[rel~="stylesheet"]'), async node => {
      const href = node.getAttribute('href');
      const base = href ? new URL(href, homepage).href : homepage.href;
      if (new URL(base).origin !== homepage.origin) throw new Error('Folha de estilo fora da origem esperada.');
      const content = absoluteCSS(href ? await readText(base) : node.textContent || '', base);
      const media = node.getAttribute('media');
      return media ? `@media ${media}{${content}}` : content;
    }));
    const converted = adaptCSS(styles.join('\n'));
    return { header, footer, ...converted, htmlClass: doc.documentElement.className, bodyClass: doc.body.className };
  })().catch(error => { pendingTemplate = undefined; throw error; });
  return pendingTemplate;
}
function copyElement(source: Element): HTMLElement {
  const copy = document.importNode(source, true) as HTMLElement;
  copy.querySelectorAll('script').forEach(node => node.remove());
  for (const node of [copy, ...Array.from(copy.querySelectorAll('*'))]) {
    for (const attribute of Array.from(node.attributes)) if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
    for (const attribute of ['href', 'src', 'action']) {
      const value = node.getAttribute(attribute);
      if (!value) continue;
      const url = new URL(value, new URL('/', location.origin));
      if (!['http:', 'https:', 'mailto:', 'tel:', 'data:'].includes(url.protocol)) { node.removeAttribute(attribute); continue; }
      node.setAttribute(attribute, url.href);
    }
  }
  return copy;
}
/** Synchronous disposer covers unmounts during the async landing/CSS fetch. */
export function mountLandingChrome(container: HTMLElement): () => void {
  const root = container.querySelector<HTMLElement>('.hp-reference-page');
  if (!root) return () => {};
  let disposed = false;
  const mounts: HTMLElement[] = [], observers: ResizeObserver[] = [];
  let errorNode: HTMLElement | undefined;
  void getTemplate().then(template => {
    if (disposed || !root.isConnected) return;
    if (template.fonts && !document.getElementById('hp-landing-font-faces')) {
      const fonts = document.createElement('style'); fonts.id = 'hp-landing-font-faces'; fonts.textContent = template.fonts; document.head.append(fonts);
    }
    for (const slot of ['header', 'footer'] as const) {
      const mount = document.createElement('div');
      mount.dataset.landingSlot = slot;
      mount.style.cssText = 'display:block;width:100%;padding:0;border:0;position:relative;';
      if (slot === 'footer') mount.style.marginTop = 'calc(26.5 * var(--hp-u))';
      const shadow = mount.attachShadow({ mode: 'open' });
      const reset = document.createElement('style'); reset.textContent = hostCSS;
      const stylesheet = document.createElement('style'); stylesheet.textContent = template.css;
      const html = document.createElement('div'); html.className = `hp-landing-html ${template.htmlClass}`;
      const body = document.createElement('div'); body.className = `hp-landing-body ${template.bodyClass}`;
      const content = copyElement(template[slot]); body.append(content); html.append(body); shadow.append(reset, stylesheet, html);
      const previous = root.querySelector(`:scope > .hp-ref-${slot}`);
      if (previous) previous.replaceWith(mount); else if (slot === 'header') root.prepend(mount); else root.append(mount);
      mounts.push(mount);
      if (slot === 'header') {
        const measure = () => { const position = getComputedStyle(content).position; mount.style.height = position === 'fixed' || position === 'absolute' ? `${content.getBoundingClientRect().height}px` : 'auto'; };
        const observer = new ResizeObserver(measure); observer.observe(content); observers.push(observer); measure();
      }
    }
    root.dataset.landingChrome = 'ready';
  }).catch(error => {
    if (disposed || !root.isConnected) return;
    console.error('Falha ao carregar cabeçalho e rodapé da landing page.', error);
    root.dataset.landingChrome = 'error';
    errorNode = document.createElement('p'); errorNode.setAttribute('role', 'status');
    errorNode.textContent = 'Não foi possível atualizar o cabeçalho e rodapé. Recarregue a página.';
    root.prepend(errorNode);
  });
  return () => { disposed = true; observers.forEach(observer => observer.disconnect()); mounts.forEach(node => node.remove()); errorNode?.remove(); };
}
