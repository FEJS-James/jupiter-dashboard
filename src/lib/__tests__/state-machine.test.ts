// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validateTransition, VALID_TRANSITIONS, ROLE_TRANSITIONS } from '../state-machine';

describe('state-machine', () => {
  describe('validateTransition', () => {
    // Happy-path: each pipeline submit endpoint's transition
    it('allows coder: in-progress → code-review', () => {
      expect(validateTransition('in-progress', 'code-review', 'coder')).toEqual({ valid: true });
    });

    it('allows reviewer: code-review → testing (approved)', () => {
      expect(validateTransition('code-review', 'testing', 'reviewer')).toEqual({ valid: true });
    });

    it('allows reviewer: code-review → in-progress (changes_requested)', () => {
      expect(validateTransition('code-review', 'in-progress', 'reviewer')).toEqual({ valid: true });
    });

    it('allows tester: testing → deploying (pass)', () => {
      expect(validateTransition('testing', 'deploying', 'tester')).toEqual({ valid: true });
    });

    it('allows tester: testing → in-progress (fail)', () => {
      expect(validateTransition('testing', 'in-progress', 'tester')).toEqual({ valid: true });
    });

    it('allows devops: deploying → done (success)', () => {
      expect(validateTransition('deploying', 'done', 'devops')).toEqual({ valid: true });
    });

    it('allows devops: deploying → in-progress (failure)', () => {
      expect(validateTransition('deploying', 'in-progress', 'devops')).toEqual({ valid: true });
    });

    it('allows orchestrator: backlog → in-progress', () => {
      expect(validateTransition('backlog', 'in-progress', 'orchestrator')).toEqual({ valid: true });
    });

    // Admin can do anything valid
    it('allows admin to do any valid transition', () => {
      expect(validateTransition('in-progress', 'code-review', 'admin')).toEqual({ valid: true });
      expect(validateTransition('backlog', 'in-progress', 'admin')).toEqual({ valid: true });
      expect(validateTransition('testing', 'deploying', 'admin')).toEqual({ valid: true });
    });

    // Wildcard roles
    it('allows orchestrator to block tasks', () => {
      expect(validateTransition('in-progress', 'blocked', 'orchestrator')).toEqual({ valid: true });
      expect(validateTransition('testing', 'blocked', 'orchestrator')).toEqual({ valid: true });
    });

    it('allows admin to archive tasks', () => {
      expect(validateTransition('done', 'archived', 'admin')).toEqual({ valid: true });
      expect(validateTransition('in-progress', 'archived', 'admin')).toEqual({ valid: true });
    });

    // Role denial
    it('denies coder from submitting review', () => {
      const result = validateTransition('code-review', 'testing', 'coder');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('coder');
    });

    it('denies reviewer from submitting code', () => {
      const result = validateTransition('in-progress', 'code-review', 'reviewer');
      expect(result.valid).toBe(false);
    });

    it('denies tester from deploying', () => {
      const result = validateTransition('deploying', 'done', 'tester');
      expect(result.valid).toBe(false);
    });

    // Invalid transitions
    it('rejects skipping stages', () => {
      const result = validateTransition('in-progress', 'testing', 'coder');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('rejects backwards from done (except archive)', () => {
      const result = validateTransition('done', 'in-progress', 'admin');
      expect(result.valid).toBe(false);
    });

    it('rejects any transition from archived', () => {
      const result = validateTransition('archived', 'backlog', 'admin');
      expect(result.valid).toBe(false);
    });

    // Unknown status
    it('rejects unknown from-status', () => {
      const result = validateTransition('unknown', 'done', 'admin');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown status');
    });
  });
});
