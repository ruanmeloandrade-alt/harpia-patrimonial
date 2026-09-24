Deno.serve(() => new Response(JSON.stringify({ ok: false, message: 'QA bootstrap encerrado.' }), { status: 410, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }));
