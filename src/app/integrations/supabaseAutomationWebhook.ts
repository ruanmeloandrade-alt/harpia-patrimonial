import { requireSupabase } from '../../core/supabase/client';
import type { AutomationCommandResult } from '../../features/automations/contracts';
import type { AutomationWebhookPort } from '../../features/automations/engine';
import type { SalesBotWebhookPort } from '../../features/salesbot/runtime';

export class SupabaseAutomationWebhook implements AutomationWebhookPort, SalesBotWebhookPort {
  async invoke(input: { url: string; method: string; payload: Record<string, unknown> }): Promise<AutomationCommandResult> {
    const supabase = requireSupabase() as any;
    const { data, error } = await supabase.functions.invoke('automation-webhook', {
      body: input,
    });
    if (error) {
      return { status: 'rejected', reason: error.message || 'Falha ao chamar executor seguro de webhook.' };
    }
    if (data?.status === 'accepted') {
      return { status: 'accepted', data: data.data };
    }
    return {
      status: data?.status === 'not_configured' ? 'not_configured' : 'rejected',
      reason: String(data?.reason || 'Webhook recusado pelo executor seguro.'),
    };
  }
}
