import ConsentUI from './ConsentUI';

interface PageProps {
    searchParams: Promise<{
        authorization_id?: string;
        error?: string;
        message?: string;
    }>;
}

export default async function ConsentPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const authorizationId = params.authorization_id;
    const error = params.error;
    const message = params.message;

    if (error && message) {
        return <ConsentUI type="error" error={message} />;
    }

    if (!authorizationId) {
        return <ConsentUI
            type="error"
            error="Missing authorization_id. This page requires an OAuth authorization request."
        />;
    }

    return <ConsentUI type="consent" authorizationId={authorizationId} />;
}
