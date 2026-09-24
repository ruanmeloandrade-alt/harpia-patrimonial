import type { InboxAutomationPort } from './contracts';
import { CrmIntegrityError, CrmService } from './service';
import { InboxIntegrityError, InboxService } from '../inbox/service';

export const READ_ONLY_MESSAGE = 'Seu acesso é somente leitura. Esta ação exige permissão de gestão.';

const CRM_READ_METHODS = new Set([
  'snapshot',
  'waitForPersistence',
  'subscribeEvents',
  'getStages',
  'getLeadHistory',
  'getLeadTasks',
]);

const INBOX_READ_METHODS = new Set([
  'snapshot',
  'getMessages',
]);

export interface InboxAutomationAccess {
  canManageSalesBot: boolean;
  canManageAiAgent: boolean;
}

export function createReadOnlyCrmService(service: CrmService): CrmService {
  return new Proxy(service, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') return value;
      if (typeof property === 'string' && CRM_READ_METHODS.has(property)) return value.bind(target);
      return () => {
        throw new CrmIntegrityError(READ_ONLY_MESSAGE);
      };
    },
  });
}

export function createReadOnlyInboxService(service: InboxService): InboxService {
  return new Proxy(service, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') return value;
      if (typeof property === 'string' && INBOX_READ_METHODS.has(property)) return value.bind(target);
      return () => {
        throw new InboxIntegrityError(READ_ONLY_MESSAGE);
      };
    },
  });
}

export function createPermissionedInboxAutomationPort(
  port: InboxAutomationPort | undefined,
  access: InboxAutomationAccess,
): InboxAutomationPort {
  const requirePort = () => {
    if (!port) throw new Error('Automação indisponível nesta sessão.');
    return port;
  };

  return {
    async startSalesBot(input) {
      if (!access.canManageSalesBot) throw new Error(READ_ONLY_MESSAGE);
      return requirePort().startSalesBot(input);
    },
    async pauseSalesBot(input) {
      if (!access.canManageSalesBot) throw new Error(READ_ONLY_MESSAGE);
      return requirePort().pauseSalesBot(input);
    },
    async startAiAgent(input) {
      if (!access.canManageAiAgent) throw new Error(READ_ONLY_MESSAGE);
      return requirePort().startAiAgent(input);
    },
    async pauseAiAgent(input) {
      if (!access.canManageAiAgent) throw new Error(READ_ONLY_MESSAGE);
      return requirePort().pauseAiAgent(input);
    },
    async getStatus(input) {
      if (!port) return { salesBot: 'unavailable', aiAgent: 'unavailable' };
      return port.getStatus(input);
    },
  };
}

export function createReadOnlyInboxAutomationPort(port?: InboxAutomationPort): InboxAutomationPort {
  return createPermissionedInboxAutomationPort(port, {
    canManageSalesBot: false,
    canManageAiAgent: false,
  });
}
