import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const frontendPath = new URL('../public/assets/registration/registration-api.js', import.meta.url);
const { buildRegistrationPayload, submitPropertyRegistration } = await import(frontendPath.href);
const input = { propertyType: 'Terreno', intent: 'venda', description: 'Descrição completa. '.repeat(600), address: 'Endereço completo. '.repeat(60), expectedValue: 1234567.89, ownerName: 'Validação transitória', phone: '(11) 99999-0000', secondaryPhone: '(21) 98888-0000', email: '', consent: true };
const payload = buildRegistrationPayload(input, '2026-10-17T00:00:00.000Z');
assert.equal(payload.metadata.description, input.description.trim());
assert.equal(payload.metadata.propertyAddress, input.address.trim());
assert.equal(payload.contact.whatsapp, '5511999990000');
assert.equal(payload.metadata.secondaryPhone, '5521988880000');
assert.equal(payload.metadata.expectedValue, 1234567.89);
assert.equal(payload.contact.email, undefined);
assert.equal(payload.metadata.consent, true);
assert.throws(() => buildRegistrationPayload({ ...input, consent: false }));
assert.throws(() => buildRegistrationPayload({ ...input, description: 'x'.repeat(12001) }));
assert.throws(() => buildRegistrationPayload({ ...input, expectedValue: NaN }));

const originalFetch = globalThis.fetch;
let captured;
try {
  globalThis.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ ok: true, leadId: 'lead_test_only' }), { status: 201 });
  };
  assert.deepEqual(await submitPropertyRegistration(input), { ok: true, leadId: 'lead_test_only' });
  assert.equal(captured.body.metadata.description, input.description.trim());
  assert.equal(captured.options.credentials, 'omit');
  assert.equal(captured.options.headers.Authorization, undefined);
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 201 });
  await assert.rejects(submitPropertyRegistration(input), /confirmar/);
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: false }), { status: 500 });
  await assert.rejects(submitPropertyRegistration(input), /confirmar/);
  globalThis.fetch = async () => { throw new TypeError('network'); };
  await assert.rejects(submitPropertyRegistration(input), /conectar/);
} finally { globalThis.fetch = originalFetch; }

let handler;
let rpcArguments;
let rpcCalls = 0;
const backend = await readFile(new URL('../supabase/functions/public-lead-ingest/index.ts', import.meta.url), 'utf8');
const executable = stripTypeScriptTypes(backend.replace(/^import .*createClient.*\n/, ''), { mode: 'strip' });
vm.runInNewContext(executable, {
  Request, Response, console,
  Deno: { env: { get: (name) => name === 'SUPABASE_URL' ? 'https://example.invalid' : name === 'SUPABASE_SERVICE_ROLE_KEY' ? 'test-only' : undefined }, serve: (fn) => { handler = fn; } },
  createClient: () => ({ rpc: async (name, args) => { assert.equal(name, 'admin_ingest_public_lead'); rpcArguments = args; rpcCalls += 1; return { data: 'lead_test_only', error: null }; } }),
  fetch: async () => new Response('{}'),
});
const request = (body) => new Request('https://example.invalid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
let response = await handler(request({ ...payload, metadata: { ...payload.metadata, role: 'admin', clientId: 'forged' } }));
assert.equal(response.status, 201);
assert.equal(rpcArguments.p_metadata.description, input.description.trim());
assert.equal(rpcArguments.p_metadata.propertyAddress, input.address.trim());
assert.equal(rpcArguments.p_metadata.expectedValue, 1234567.89);
assert.equal(rpcArguments.p_metadata.role, undefined);
assert.equal(rpcArguments.p_metadata.clientId, undefined);
const acceptedCalls = rpcCalls;
for (const metadata of [{ ...payload.metadata, consent: false }, { ...payload.metadata, description: 'x'.repeat(12001) }, { ...payload.metadata, propertyAddress: '' }]) {
  response = await handler(request({ ...payload, metadata }));
  assert.equal(response.status, 400);
}
assert.equal(rpcCalls, acceptedCalls);
response = await handler(request({ ...payload, action: 'existing-public-conversion', metadata: { description: 'x'.repeat(700) } }));
assert.equal(response.status, 201);
assert.equal(rpcArguments.p_metadata.description.length, 500);
assert.equal(rpcArguments.p_whatsapp, '5511999990000');
console.log('PASS: full owner data, phones, BRL, optional email, consent, reserved identity, server limits, existing conversions, success acknowledgement and network failures. No external requests or persistent records.');
