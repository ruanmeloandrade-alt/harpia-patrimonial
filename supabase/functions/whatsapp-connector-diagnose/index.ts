
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(() => new Response(
  JSON.stringify({ ok: false, message: 'Diagnóstico temporário desativado.' }),
  {
    status: 410,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  },
));
