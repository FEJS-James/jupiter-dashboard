/**
 * Pipeline state machine — validates status transitions and role permissions.
 */

export type TaskStatus = 'backlog' | 'in-progress' | 'code-review' | 'testing' | 'deploying' | 'done' | 'blocked' | 'archived';
export type ApiKeyRole = 'coder' | 'reviewer' | 'tester' | 'devops' | 'orchestrator' | 'admin';

const VALID_TRANSITIONS: Record<string, string[]> = {
  'backlog': ['in-progress', 'blocked', 'archived'],
  'in-progress': ['code-review', 'blocked', 'archived'],
  'code-review': ['testing', 'in-progress', 'blocked', 'archived'],
  'testing': ['deploying', 'in-progress', 'blocked', 'archived'],
  'deploying': ['done', 'in-progress', 'blocked', 'archived'],
  'done': ['archived'],
  'blocked': ['in-progress', 'archived'],
  'archived': [],
};

const ROLE_TRANSITIONS: Record<string, string[]> = {
  'in-progress→code-review': ['coder'],
  'code-review→testing': ['reviewer'],
  'code-review→in-progress': ['reviewer'],
  'testing→deploying': ['tester'],
  'testing→in-progress': ['tester'],
  'deploying→done': ['devops'],
  'deploying→in-progress': ['devops'],
  'backlog→in-progress': ['orchestrator', 'admin'],
  'blocked→in-progress': ['orchestrator', 'admin'],
  '*→blocked': ['orchestrator', 'admin'],
  '*→archived': ['admin'],
};

export interface TransitionResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that a status transition is allowed for the given role.
 */
export function validateTransition(from: string, to: string, role: string): TransitionResult {
  // Check the transition itself is structurally valid
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) {
    return { valid: false, error: `Unknown status: '${from}'` };
  }
  if (!allowed.includes(to)) {
    return { valid: false, error: `Invalid transition from '${from}' to '${to}'` };
  }

  // Check role permission — try specific key first, then wildcard
  const specificKey = `${from}→${to}`;
  const wildcardKey = `*→${to}`;

  // admin can do everything (checked before role mapping so missing entries don't block admin)
  if (role === 'admin') {
    return { valid: true };
  }

  const allowedRoles = ROLE_TRANSITIONS[specificKey] ?? ROLE_TRANSITIONS[wildcardKey];

  if (!allowedRoles) {
    return { valid: false, error: `No role mapping found for transition '${from}' → '${to}'` };
  }

  if (!allowedRoles.includes(role)) {
    return { valid: false, error: `Role '${role}' is not allowed to transition from '${from}' to '${to}'` };
  }

  return { valid: true };
}

export { VALID_TRANSITIONS, ROLE_TRANSITIONS };
