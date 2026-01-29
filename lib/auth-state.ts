/**
 * Temporary state storage for authentication flows.
 * Used to pass sensitive data (like password) between screens during the registration process
 * without exposing it in URL parameters or persistent storage.
 * 
 * This allows us to automatically sign in the user after they verify their email
 * on the same device/tab where they registered.
 */

class AuthFlowState {
    private static instance: AuthFlowState;
    private _tempPassword: string | null = null;
    private _email: string | null = null;

    private constructor() { }

    public static getInstance(): AuthFlowState {
        if (!AuthFlowState.instance) {
            AuthFlowState.instance = new AuthFlowState();
        }
        return AuthFlowState.instance;
    }

    public setCredentials(email: string, password: string) {
        this._email = email;
        this._tempPassword = password;
    }

    public getPassword(email: string): string | null {
        // Only return password if email matches, to prevent mixups
        if (this._email === email) {
            return this._tempPassword;
        }
        return null;
    }

    public clear() {
        this._tempPassword = null;
        this._email = null;
    }
}

export const authState = AuthFlowState.getInstance();
