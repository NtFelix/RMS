import React from 'react';
import ConsentPage from './page';
import ConsentUI from './ConsentUI';
import { getAuthorizationDetailsAction } from './actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

jest.mock('./ConsentUI', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

jest.mock('./actions', () => ({
    getAuthorizationDetailsAction: jest.fn(),
    getUserMcpOrganisationsAction: jest.fn(),
}));

jest.mock('@/lib/supabase-server', () => ({
    createSupabaseServerClient: jest.fn(),
}));

// Mimic the real redirect(), which throws a NEXT_REDIRECT error to stop rendering.
jest.mock('next/navigation', () => ({
    redirect: jest.fn((url: string) => {
        throw Object.assign(new Error('NEXT_REDIRECT'), {
            digest: `NEXT_REDIRECT;replace;${url};307;`,
        });
    }),
}));

type AnyElement = React.ReactElement<any>;

// The default export returns <Suspense><ConsentContent searchParams={...} /></Suspense>.
// Run the inner async component directly so its returned ConsentUI element can be inspected.
async function runConsent(searchParams: Promise<Record<string, string | undefined>>) {
    const shell = ConsentPage({ searchParams }) as AnyElement;
    const inner = shell.props.children as AnyElement;
    expect(inner.props.searchParams).toBe(searchParams);
    const ConsentContent = inner.type as (props: AnyElement['props']) => Promise<AnyElement>;
    return ConsentContent(inner.props);
}

describe('OAuth consent page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the error state for an error/message pair', async () => {
        const element = await runConsent(Promise.resolve({ error: 'x', message: 'boom' }));

        expect(element.type).toBe(ConsentUI);
        expect(element.props.type).toBe('error');
        expect(element.props.error).toBe('boom');
    });

    it('renders the missing authorization_id error when no id is given', async () => {
        const element = await runConsent(Promise.resolve({}));

        expect(element.type).toBe(ConsentUI);
        expect(element.props.type).toBe('error');
        expect(element.props.error).toMatch(/^Missing authorization_id/);
        expect(createSupabaseServerClient).not.toHaveBeenCalled();
    });

    it('redirects unauthenticated users to login before loading authorization details', async () => {
        const getUser = jest.fn().mockResolvedValue({ data: { user: null } });
        (createSupabaseServerClient as jest.Mock).mockResolvedValue({ auth: { getUser } });

        await expect(
            runConsent(Promise.resolve({ authorization_id: 'auth_123' }))
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(redirect).toHaveBeenCalledWith(expect.stringMatching(/^\/auth\/login\?redirect=/));
        expect(getAuthorizationDetailsAction).not.toHaveBeenCalled();
    });
});
