import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { verifyTelegramInitData } from '../src/utils/telegramAuth.js';

function signInitData(params: Record<string, string>, botToken: string): string {
  const entries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const sp = new URLSearchParams({ ...params, hash });
  return sp.toString();
}

describe('verifyTelegramInitData', () => {
  const botToken = '123456:TEST_BOT_TOKEN';

  it('verifies valid signed initData', () => {
    const authDate = String(Math.floor(Date.now() / 1000));
    const initData = signInitData(
      {
        auth_date: authDate,
        query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
        user: JSON.stringify({ id: 42, first_name: 'Denis', username: 'denis' }),
      },
      botToken
    );

    const verified = verifyTelegramInitData(initData, botToken);
    expect(verified).not.toBeNull();
    expect(verified!.user.id).toBe(42);
    expect(verified!.user.first_name).toBe('Denis');
  });

  it('rejects tampered initData', () => {
    const authDate = String(Math.floor(Date.now() / 1000));
    const initData = signInitData(
      {
        auth_date: authDate,
        user: JSON.stringify({ id: 42, first_name: 'Denis' }),
      },
      botToken
    );
    const tampered = initData.replace('Denis', 'Hacker');
    expect(verifyTelegramInitData(tampered, botToken)).toBeNull();
  });

  it('rejects expired initData', () => {
    const oldAuthDate = String(Math.floor(Date.now() / 1000) - 100_000);
    const initData = signInitData(
      {
        auth_date: oldAuthDate,
        user: JSON.stringify({ id: 42, first_name: 'Denis' }),
      },
      botToken
    );
    expect(verifyTelegramInitData(initData, botToken)).toBeNull();
  });

  it('rejects wrong bot token', () => {
    const authDate = String(Math.floor(Date.now() / 1000));
    const initData = signInitData(
      {
        auth_date: authDate,
        user: JSON.stringify({ id: 42, first_name: 'Denis' }),
      },
      botToken
    );
    expect(verifyTelegramInitData(initData, '999999:WRONG')).toBeNull();
  });
});
