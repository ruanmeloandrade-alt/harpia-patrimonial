const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  return new Response(
    JSON.stringify({
      status: 'rejected',
      reason: 'Endpoint legado desativado. Use o runtime canônico ai-model-invoke ou o runtime interno f05-runtime-worker.',
    }),
    { status: 410, headers },
  );
});
