import { getAuthErrorMessage, DB_CONNECTION_ERROR_MESSAGE } from './auth-error-handler';
import { AuthError } from '@supabase/supabase-js';

describe('getAuthErrorMessage', () => {
  it('should return a friendly message for invalid credentials', () => {
    const error = { code: 'invalid_credentials', message: 'Invalid login credentials' } as AuthError;
    expect(getAuthErrorMessage(error)).toBe('Ungültige E-Mail-Adresse oder Passwort. Bitte überprüfen Sie Ihre Eingaben.');
  });

  it('should return the friendly DB_CONNECTION_ERROR_MESSAGE for "Failed to fetch"', () => {
    const error = { message: 'Failed to fetch' } as AuthError;
    expect(getAuthErrorMessage(error)).toBe(DB_CONNECTION_ERROR_MESSAGE);
  });

  it('should return the friendly DB_CONNECTION_ERROR_MESSAGE for "Load failed"', () => {
    const error = { message: 'Load failed' } as AuthError;
    expect(getAuthErrorMessage(error)).toBe(DB_CONNECTION_ERROR_MESSAGE);
  });

  it('should return the friendly DB_CONNECTION_ERROR_MESSAGE for "NetworkError"', () => {
    const error = { message: 'NetworkError' } as AuthError;
    expect(getAuthErrorMessage(error)).toBe(DB_CONNECTION_ERROR_MESSAGE);
  });

  it('should return the original message if no match is found', () => {
    const error = { message: 'Some unknown error' } as AuthError;
    expect(getAuthErrorMessage(error)).toBe('Some unknown error');
  });
});
