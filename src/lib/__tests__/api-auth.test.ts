// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashApiKey, generateApiKey, AuthError } from '../api-auth';

// We test the pure/crypto functions directly.
// validateApiKey and requireRole depend on the DB so are tested via integration/route tests.

describe('api-auth', () => {
  describe('hashApiKey', () => {
    it('returns a 64-char hex string (SHA-256)', () => {
      const hash = hashApiKey('test-key');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic', () => {
      expect(hashApiKey('same')).toBe(hashApiKey('same'));
    });

    it('produces different hashes for different inputs', () => {
      expect(hashApiKey('a')).not.toBe(hashApiKey('b'));
    });
  });

  describe('generateApiKey', () => {
    it('returns plaintext starting with jd_', () => {
      const { plaintext } = generateApiKey();
      expect(plaintext).toMatch(/^jd_[0-9a-f]{64}$/);
    });

    it('returns a valid SHA-256 hash', () => {
      const { hash } = generateApiKey();
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns prefix of length 8', () => {
      const { prefix, plaintext } = generateApiKey();
      expect(prefix).toHaveLength(8);
      expect(plaintext.startsWith(prefix)).toBe(true);
    });

    it('hash matches hashing the plaintext', () => {
      const { plaintext, hash } = generateApiKey();
      expect(hashApiKey(plaintext)).toBe(hash);
    });

    it('generates unique keys', () => {
      const a = generateApiKey();
      const b = generateApiKey();
      expect(a.plaintext).not.toBe(b.plaintext);
      expect(a.hash).not.toBe(b.hash);
    });
  });

  describe('AuthError', () => {
    it('carries status and message', () => {
      const err = new AuthError('nope', 403);
      expect(err.message).toBe('nope');
      expect(err.status).toBe(403);
      expect(err.name).toBe('AuthError');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
