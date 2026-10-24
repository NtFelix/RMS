import React from 'react';
import ConsentPage from './page';
import ConsentUI, { ConsentLoading } from './ConsentUI';
import { getAuthorizationDetailsAction, getUserMcpOrganisationsAction } from './actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

jest.mock('./ConsentUI', () => ({
    __esModule: true,
    default: jest.fn(() => null),
    ConsentLoading: jest.fn(() => null),
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

    it('url-encodes the authorization_id in the login redirect', async () => {
        const getUser = jest.fn().mockResolvedValue({ data: { user: null } });
        (createSupabaseServerClient as jest.Mock).mockResolvedValue({ auth: { getUser } });

        await expect(
            runConsent(Promise.resolve({ authorization_id: 'a&b=c d' }))
        ).rejects.toThrow('NEXT_REDIRECT');

        const consentPath = `/oauth/consent?authorization_id=${encodeURIComponent('a&b=c d')}`;
        expect(redirect).toHaveBeenCalledWith(`/auth/login?redirect=${encodeURIComponent(consentPath)}`);
    });

    it('uses the shared loading card as the Suspense fallback', () => {
        const shell = ConsentPage({ searchParams: Promise.resolve({}) }) as AnyElement;

        expect(shell.props.fallback.type).toBe(ConsentLoading);
    });

    describe('authenticated user', () => {
        beforeEach(() => {
            const getUser = jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } });
            (createSupabaseServerClient as jest.Mock).mockResolvedValue({ auth: { getUser } });
        });

        it('renders the consent screen with details and organisations', async () => {
            const details = { client: { id: 'client-1' } };
            const orgs = [{ id: 'org-1' }];
            (getAuthorizationDetailsAction as jest.Mock).mockResolvedValue({ success: true, data: details });
            (getUserMcpOrganisationsAction as jest.Mock).mockResolvedValue({ success: true, data: orgs });

            const element = await runConsent(Promise.resolve({ authorization_id: 'auth_123' }));

            expect(element.props.type).toBe('consent');
            expect(element.props.authorizationId).toBe('auth_123');
            expect(element.props.initialData).toBe(details);
            expect(element.props.initialOrganisations).toBe(orgs);
            expect(getUserMcpOrganisationsAction).toHaveBeenCalledWith('client-1');
        });

        it('passes the fetch error to the consent screen when details cannot be loaded', async () => {
            (getAuthorizationDetailsAction as jest.Mock).mockResolvedValue({ success: false, error: 'nope' });

            const element = await runConsent(Promise.resolve({ authorization_id: 'auth_123' }));

            expect(element.props.type).toBe('consent');
            expect(element.props.initialError).toBe('nope');
            expect(element.props.initialData).toBeUndefined();
            expect(getUserMcpOrganisationsAction).not.toHaveBeenCalled();
        });

        it('renders the manage screen for an auto-approved authorization', async () => {
            (getAuthorizationDetailsAction as jest.Mock).mockResolvedValue({
                success: true,
                data: { redirect_url: 'https://client.example/cb' },
            });

            const element = await runConsent(Promise.resolve({ authorization_id: 'auth_123' }));

            expect(element.props.type).toBe('manage');
            expect(element.props.autoRedirectUrl).toBe('https://client.example/cb');
        });

        it('renders an error when auto-approval has no redirect link', async () => {
            (getAuthorizationDetailsAction as jest.Mock).mockResolvedValue({ success: true, data: {} });

            const element = await runConsent(Promise.resolve({ authorization_id: 'auth_123' }));

            expect(element.props.type).toBe('error');
        });

        it('renders the success screen when the authorization was already processed', async () => {
            (getAuthorizationDetailsAction as jest.Mock).mockResolvedValue({ success: false, alreadyProcessed: true });

            const element = await runConsent(Promise.resolve({ authorization_id: 'auth_123' }));

            expect(element.props.type).toBe('success');
        });
    });
});
