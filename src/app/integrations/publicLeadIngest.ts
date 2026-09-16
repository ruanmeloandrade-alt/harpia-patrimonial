import { requireSupabase } from '../../core/supabase/client';
import type {
  Front04LeadConversionEventPort,
  Front04LeadConversionIngestPort,
  Front04LeadConversionResultPort,
} from '../../features/public-site/front04ConversionAdapter';

export const ingestPublicLead: Front04LeadConversionIngestPort = async (
  event: Front04LeadConversionEventPort,
): Promise<Front04LeadConversionResultPort> => {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('public-lead-ingest', {
    body: event,
  });

  if (error) throw error;
  if (!data?.ok || !data?.leadId) {
    throw new Error(data?.message || 'Não foi possível registrar o lead no CRM.');
  }

  return {
    leadId: String(data.leadId),
    created: true,
    automaticMessageSent: false,
  };
};
