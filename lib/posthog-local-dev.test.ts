import { isLocalDevHostname } from './posthog-local-dev'

describe('isLocalDevHostname', () => {
  it('treats localhost and loopback addresses as local dev', () => {
    expect(isLocalDevHostname('localhost')).toBe(true)
    expect(isLocalDevHostname('127.0.0.1')).toBe(true)
    expect(isLocalDevHostname('::1')).toBe(true)
    expect(isLocalDevHostname('0.0.0.0')).toBe(true)
  })

  it('treats *.localhost and *.local subdomains as local dev', () => {
    expect(isLocalDevHostname('myapp.localhost')).toBe(true)
    expect(isLocalDevHostname('foo.local')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(isLocalDevHostname('LOCALHOST')).toBe(true)
  })

  it('treats production hosts as non-local', () => {
    expect(isLocalDevHostname('mietevo.de')).toBe(false)
    expect(isLocalDevHostname('app.mietevo.de')).toBe(false)
    expect(isLocalDevHostname('localhost.evil.com')).toBe(false)
  })

  it('handles empty/missing hostnames safely', () => {
    expect(isLocalDevHostname('')).toBe(false)
    expect(isLocalDevHostname(null)).toBe(false)
    expect(isLocalDevHostname(undefined)).toBe(false)
  })
})
