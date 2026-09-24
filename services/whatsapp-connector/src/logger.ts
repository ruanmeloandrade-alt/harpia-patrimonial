import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL?.trim() || 'info',
  redact: {
    paths: [
      'authorization',
      '*.authorization',
      'token',
      '*.token',
      'qr',
      '*.qr',
      'session',
      '*.session',
      'encrypted_value',
      '*.encrypted_value',
    ],
    censor: '[REDACTED]',
  },
});
