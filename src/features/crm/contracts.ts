import type { CrmEvent, CrmEventSink, LeadInterest } from './domain';
import { CrmService } from './service';

export interface LeadConversionContact {
  name: string;
  email?: string;
  whatsapp?: string;
}

export interface LeadConversionEvent {
  contact: LeadConversionContact;
  origin: string;
  action?: string;
  page?: string;
  interest?: LeadInterest;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

export interface LeadConversionResult {
  leadId: string;
  created: true;
  automaticMessageSent: false;
}

export const ingestLeadConversion = (
  crm: CrmService,
  event: LeadConversionEvent,
): LeadConversionResult => {
  const lead = crm.createLead({
    name: event.contact.name,
    email: event.contact.email,
    whatsapp: event.contact.whatsapp,
    source: event.origin,
    sourceAction: event.action,
    sourcePage: event.page,
    sourceOccurredAt: event.occurredAt,
    sourceMetadata: event.metadata,
    interest: event.interest,
  });

  return {
    leadId: lead.id,
    created: true,
    automaticMessageSent: false,
  };
};

export class BufferedCrmEventSink implements CrmEventSink {
  private readonly events: CrmEvent[] = [];

  publish(event: CrmEvent): void {
    this.events.push(event);
  }

  drain(): CrmEvent[] {
    return this.events.splice(0, this.events.length);
  }

  peek(): CrmEvent[] {
    return [...this.events];
  }
}

export type AutomationResourceStatus = 'unavailable' | 'idle' | 'running' | 'paused';

export interface ConversationAutomationStatus {
  salesBot: AutomationResourceStatus;
  aiAgent: AutomationResourceStatus;
}

export interface InboxAutomationContext {
  leadId: string;
  conversationId?: string;
}

export interface InboxAutomationStatusContext extends InboxAutomationContext {
  botId?: string;
  agentId?: string;
}

export interface InboxAutomationPort {
  startSalesBot(input: InboxAutomationContext & { botId?: string }): Promise<void>;
  pauseSalesBot(input: InboxAutomationContext): Promise<void>;
  startAiAgent(input: InboxAutomationContext & { agentId?: string }): Promise<void>;
  pauseAiAgent(input: InboxAutomationContext): Promise<void>;
  getStatus(input: InboxAutomationStatusContext): Promise<ConversationAutomationStatus>;
}

export class UnavailableInboxAutomationPort implements InboxAutomationPort {
  async startSalesBot(): Promise<void> {
    throw new Error('SalesBot aguardando integração com a Frente05.');
  }

  async pauseSalesBot(): Promise<void> {
    throw new Error('SalesBot aguardando integração com a Frente05.');
  }

  async startAiAgent(): Promise<void> {
    throw new Error('Agente IA aguardando integração com a Frente05.');
  }

  async pauseAiAgent(): Promise<void> {
    throw new Error('Agente IA aguardando integração com a Frente05.');
  }

  async getStatus(): Promise<ConversationAutomationStatus> {
    return { salesBot: 'unavailable', aiAgent: 'unavailable' };
  }
}
