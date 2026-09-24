import {
  BufferJSON,
  initAuthCreds,
  proto,
} from '@whiskeysockets/baileys';
import { config } from './config.js';
import { decryptState, encryptState } from './cryptoState.js';
import { db } from './db.js';

type AuthStateBundle = {
  state: {
    creds: ReturnType<typeof initAuthCreds>;
    keys: {
      get: (type: string, ids: string[]) => Promise<Record<string, unknown>>;
      set: (data: Record<string, Record<string, unknown | null | undefined>>) => Promise<void>;
    };
  };
  saveCreds: () => Promise<void>;
  clear: () => Promise<void>;
};

function stateKey(type: string, id: string) {
  return `${type}:${id}`;
}

async function readEncrypted(sessionId: string, key: string): Promise<unknown | null> {
  const { data, error } = await db.rpc('admin_get_whatsapp_auth_state', {
    p_session_id: sessionId,
    p_state_key: key,
  });

  if (error) throw error;
  if (!data) return null;

  const json = decryptState(
    String(data),
    config.sessionEncryptionKey,
  );
  return JSON.parse(json, BufferJSON.reviver);
}

async function writeEncrypted(sessionId: string, key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value, BufferJSON.replacer);
  const encrypted = encryptState(json, config.sessionEncryptionKey);

  const { error } = await db.rpc('admin_upsert_whatsapp_auth_state', {
    p_session_id: sessionId,
    p_state_key: key,
    p_encrypted_value: encrypted,
  });

  if (error) throw error;
}

async function removeEncrypted(sessionId: string, key: string): Promise<void> {
  const { error } = await db.rpc('admin_delete_whatsapp_auth_state', {
    p_session_id: sessionId,
    p_state_key: key,
  });

  if (error) throw error;
}

export async function createDatabaseAuthState(sessionId: string): Promise<AuthStateBundle> {
  const storedCreds = await readEncrypted(sessionId, 'creds');
  const creds = (
    storedCreds && typeof storedCreds === 'object'
      ? storedCreds
      : initAuthCreds()
  ) as ReturnType<typeof initAuthCreds>;

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result: Record<string, unknown> = {};

          await Promise.all(ids.map(async (id) => {
            let value = await readEncrypted(sessionId, stateKey(type, id));

            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value as never);
            }

            if (value !== null) result[id] = value;
          }));

          return result;
        },
        set: async (data) => {
          const operations: Promise<void>[] = [];

          for (const [type, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries ?? {})) {
              operations.push(
                value === null || value === undefined
                  ? removeEncrypted(sessionId, stateKey(type, id))
                  : writeEncrypted(sessionId, stateKey(type, id), value),
              );
            }
          }

          await Promise.all(operations);
        },
      },
    },
    saveCreds: async () => {
      await writeEncrypted(sessionId, 'creds', creds);
    },
    clear: async () => {
      const { error } = await db.rpc('admin_delete_whatsapp_auth_state', {
        p_session_id: sessionId,
        p_state_key: null,
      });

      if (error) throw error;
    },
  };
}
