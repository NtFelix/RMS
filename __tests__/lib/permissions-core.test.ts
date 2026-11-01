import { evaluatePermission, evaluatePermissionResult, type PermissionCheckResult } from '@/lib/permissions-core';

/**
 * evaluatePermissionResult tells "right missing" (denied) apart from "the check itself failed" (error);
 * evaluatePermission stays a fail-closed boolean on top of it. Supabase is a mock, all ids are synthetic.
 */

const USER = 'user-1';
const ORG = 'org-1';
const MEMBER = 'member-1';

type Answer = { data: unknown; error: unknown };
type Tables = Partial<Record<string, Answer | (() => Promise<Answer>)>>;

/** Query builder: every chain method returns itself, awaiting or maybeSingle() yields the table's answer */
function fakeSupabase(tables: Tables) {
  return {
    from: (table: string) => {
      const answer = async () => {
        const entry = tables[table];
        if (!entry) return { data: null, error: null };
        return typeof entry === 'function' ? entry() : entry;
      };
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'in']) chain[method] = () => chain;
      chain.maybeSingle = answer;
      chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => answer().then(resolve, reject);
      return chain;
    },
  };
}

const activeMember = (rolle: string, extra: Record<string, unknown> = {}): Answer => ({
  data: { id: MEMBER, rolle, status: 'aktiv', Organisation: { ist_versteckt: false, owner_id: 'someone-else' }, ...extra },
  error: null,
});

const QUERY_ERROR = { message: 'canceling statement due to statement timeout' };

describe('evaluatePermissionResult', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  type Case = { name: string; tables: Tables; expected: PermissionCheckResult };
  const cases: Case[] = [
    // allowed
    { name: 'owner has implicit access', tables: { Organisation_Mitglieder: activeMember('owner') }, expected: 'allowed' },
    { name: 'admin has implicit access', tables: { Organisation_Mitglieder: activeMember('admin') }, expected: 'allowed' },
    {
      name: 'owner of the hidden personal organisation has access',
      tables: { Organisation_Mitglieder: activeMember('member', { Organisation: { ist_versteckt: true, owner_id: USER } }) },
      expected: 'allowed',
    },
    {
      name: 'override (array) grants the action',
      tables: {
        Organisation_Mitglieder: activeMember('member'),
        Organisation_Mitglieder_Overrides: { data: { berechtigungen: { module: { mieter: ['ansehen'] } } }, error: null },
      },
      expected: 'allowed',
    },
    {
      name: 'policy (object format) grants the action',
      tables: {
        Organisation_Mitglieder: activeMember('member'),
        Organisation_Mitglieder_Policies: { data: [{ policy_id: 'p1' }], error: null },
        Organisation_Policies: { data: [{ berechtigungen: { module: { mieter: { ansehen: true } } } }], error: null },
      },
      expected: 'allowed',
    },
    // denied: the right is missing
    { name: 'no membership', tables: { Organisation_Mitglieder: { data: null, error: null } }, expected: 'denied' },
    {
      name: 'inactive membership',
      tables: { Organisation_Mitglieder: activeMember('owner', { status: 'eingeladen' }) },
      expected: 'denied',
    },
    {
      name: 'override without the action',
      tables: {
        Organisation_Mitglieder: activeMember('member'),
        Organisation_Mitglieder_Overrides: { data: { berechtigungen: { module: { mieter: ['bearbeiten'] } } }, error: null },
      },
      expected: 'denied',
    },
    { name: 'member without any policy', tables: { Organisation_Mitglieder: activeMember('member'), Organisation_Mitglieder_Policies: { data: [], error: null } }, expected: 'denied' },
    {
      name: 'policies without the module',
      tables: {
        Organisation_Mitglieder: activeMember('member'),
        Organisation_Mitglieder_Policies: { data: [{ policy_id: 'p1' }], error: null },
        Organisation_Policies: { data: [{ berechtigungen: { module: { finanzen: ['ansehen'] } } }], error: null },
      },
      expected: 'denied',
    },
    // error: the check itself failed
    { name: 'membership query fails', tables: { Organisation_Mitglieder: { data: null, error: QUERY_ERROR } }, expected: 'error' },
    {
      name: 'member policies query fails',
      tables: {
        Organisation_Mitglieder: activeMember('member'),
        Organisation_Mitglieder_Policies: { data: null, error: QUERY_ERROR },
      },
      expected: 'error',
    },
    {
      name: 'policies query fails',
      tables: {
        Organisation_Mitglieder: activeMember('member'),
        Organisation_Mitglieder_Policies: { data: [{ policy_id: 'p1' }], error: null },
        Organisation_Policies: { data: null, error: QUERY_ERROR },
      },
      expected: 'error',
    },
    {
      name: 'a query throws',
      tables: {
        Organisation_Mitglieder: async () => {
          throw new Error('network down');
        },
      },
      expected: 'error',
    },
  ];

  it.each(cases)('$name -> $expected (and evaluatePermission is true only for allowed)', async ({ tables, expected }) => {
    const supabase = fakeSupabase(tables);

    expect(await evaluatePermissionResult(supabase, USER, ORG, 'mieter', 'ansehen')).toBe(expected);
    expect(await evaluatePermission(supabase, USER, ORG, 'mieter', 'ansehen')).toBe(expected === 'allowed');
  });

  it('a missing user or organisation is denied (not an error) and nothing is queried', async () => {
    const from = jest.fn();

    expect(await evaluatePermissionResult({ from }, '', ORG, 'mieter', 'ansehen')).toBe('denied');
    expect(await evaluatePermissionResult({ from }, USER, null, 'mieter', 'ansehen')).toBe('denied');
    expect(await evaluatePermission({ from }, USER, null, 'mieter', 'ansehen')).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it('keeps the former behaviour for a failed override query: it falls through to the policies', async () => {
    const supabase = fakeSupabase({
      Organisation_Mitglieder: activeMember('member'),
      Organisation_Mitglieder_Overrides: { data: null, error: QUERY_ERROR },
      Organisation_Mitglieder_Policies: { data: [{ policy_id: 'p1' }], error: null },
      Organisation_Policies: { data: [{ berechtigungen: { module: { mieter: ['ansehen'] } } }], error: null },
    });

    expect(await evaluatePermissionResult(supabase, USER, ORG, 'mieter', 'ansehen')).toBe('allowed');
  });

  it('logs a failed query, so the cause is not lost', async () => {
    await evaluatePermissionResult(fakeSupabase({ Organisation_Mitglieder: { data: null, error: QUERY_ERROR } }), USER, ORG, 'mieter', 'ansehen');

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('mieter:ansehen'), QUERY_ERROR);
  });
});
