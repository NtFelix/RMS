import { appendSafeAuthRedirect, getSafeAuthRedirect } from './auth-redirects'

describe('auth redirect helpers', () => {
  const origin = 'https://mietevo.de'

  describe('getSafeAuthRedirect', () => {
    it('returns the dashboard route when redirect is missing', () => {
      expect(getSafeAuthRedirect(null, origin)).toBe('/dashboard')
    })

    it('preserves same-origin paths with search params and hashes', () => {
      expect(getSafeAuthRedirect('/oauth/consent?authorization_id=abc123#top', origin))
        .toBe('/oauth/consent?authorization_id=abc123#top')
    })

    it('rejects absolute off-origin redirects', () => {
      expect(getSafeAuthRedirect('https://evil.example/oauth/consent', origin)).toBe('/dashboard')
    })

    it('rejects scheme-relative redirects', () => {
      expect(getSafeAuthRedirect('//evil.example/oauth/consent', origin)).toBe('/dashboard')
    })

    it('rejects backslash-based host smuggling', () => {
      expect(getSafeAuthRedirect('/\\\\evil.example/oauth/consent', origin)).toBe('/dashboard')
    })
  })

  describe('appendSafeAuthRedirect', () => {
    it('adds a safe redirect query parameter', () => {
      const callbackUrl = new URL('/auth/callback?origin=https%3A%2F%2Fmietevo.de', origin)

      appendSafeAuthRedirect(callbackUrl, '/oauth/consent?authorization_id=abc123')

      expect(callbackUrl.toString()).toBe(
        'https://mietevo.de/auth/callback?origin=https%3A%2F%2Fmietevo.de&redirect=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc123'
      )
    })

    it('does not add unsafe redirects', () => {
      const callbackUrl = new URL('/auth/callback?origin=https%3A%2F%2Fmietevo.de', origin)

      appendSafeAuthRedirect(callbackUrl, 'https://evil.example/oauth/consent')

      expect(callbackUrl.toString()).toBe('https://mietevo.de/auth/callback?origin=https%3A%2F%2Fmietevo.de')
    })
  })
})
