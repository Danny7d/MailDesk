import { describe, it, expect } from 'vitest';
import { getConfig } from '../src/config.js';

describe('API Config Validation', () => {
  it('T8: Config validation throws on missing required variable', () => {
    // Save original env
    const originalEnv = { ...process.env };

    // Remove required variables
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;

    expect(() => getConfig()).toThrow('Invalid environment variables');

    // Restore
    process.env = originalEnv;
  });

  it('T8: Error message names all invalid variables', () => {
    const originalEnv = { ...process.env };

    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;

    try {
      getConfig();
      expect.fail('Should have thrown');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('DATABASE_URL');
      expect(message).toContain('REDIS_URL');
    }

    process.env = originalEnv;
  });
});
