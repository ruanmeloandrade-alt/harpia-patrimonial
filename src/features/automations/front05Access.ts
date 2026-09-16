export type Front05Module = 'salesbot' | 'automations' | 'ai' | 'integrations';

export interface Front05ModuleAccess {
  view: boolean;
  manage: boolean;
}

export interface Front05Access {
  salesbot: Front05ModuleAccess;
  automations: Front05ModuleAccess;
  ai: Front05ModuleAccess;
  integrations: Front05ModuleAccess;
}

export const FRONT05_PERMISSION_KEYS = {
  salesbot: { view: 'salesbot.view', manage: 'salesbot.manage' },
  automations: { view: 'automations.view', manage: 'automations.manage' },
  ai: { view: 'ai.view', manage: 'ai.manage' },
  integrations: { view: 'integrations.view', manage: 'integrations.manage' },
} as const;

export const NO_FRONT05_ACCESS: Front05Access = {
  salesbot: { view: false, manage: false },
  automations: { view: false, manage: false },
  ai: { view: false, manage: false },
  integrations: { view: false, manage: false },
};

/**
 * Acesso total existe apenas para usos explícitos (ex.: harness standalone de QA).
 * O workspace integrado não usa este objeto como fallback de segurança.
 */
export const FULL_FRONT05_ACCESS: Front05Access = {
  salesbot: { view: true, manage: true },
  automations: { view: true, manage: true },
  ai: { view: true, manage: true },
  integrations: { view: true, manage: true },
};

function moduleAccess(
  hasPermission: (permission: string) => boolean,
  keys: { readonly view: string; readonly manage: string },
): Front05ModuleAccess {
  const manage = hasPermission(keys.manage);
  return {
    view: manage || hasPermission(keys.view),
    manage,
  };
}

export function buildFront05Access(hasPermission: (permission: string) => boolean): Front05Access {
  return {
    salesbot: moduleAccess(hasPermission, FRONT05_PERMISSION_KEYS.salesbot),
    automations: moduleAccess(hasPermission, FRONT05_PERMISSION_KEYS.automations),
    ai: moduleAccess(hasPermission, FRONT05_PERMISSION_KEYS.ai),
    integrations: moduleAccess(hasPermission, FRONT05_PERMISSION_KEYS.integrations),
  };
}
