import {
  CHUNK_RELOAD_MIN_INTERVAL_MS,
  CHUNK_RELOAD_STORAGE_KEY,
  isChunkLoadError,
  reloadOnceForChunkError,
} from '@/lib/chunk-load-recovery'

describe('isChunkLoadError', () => {
  it('erkennt den Namen ChunkLoadError', () => {
    const error = new Error('irgendwas')
    error.name = 'ChunkLoadError'
    expect(isChunkLoadError(error)).toBe(true)
  })

  it.each([
    'Failed to load chunk /_next/static/chunks/abc123.js from module 42',
    'Loading chunk 123 failed.\n(error: https://mietevo.de/_next/static/chunks/123.js)',
    'Loading CSS chunk 7 failed.',
    'Failed to fetch dynamically imported module: https://mietevo.de/_next/static/chunks/x.js',
    'error loading dynamically imported module',
  ])('erkennt die Meldung "%s"', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true)
  })

  it('erkennt normale Fehler nicht', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isChunkLoadError(new TypeError('Failed to fetch'))).toBe(false)
  })

  it('verträgt Nicht-Fehler-Werte', () => {
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
    expect(isChunkLoadError('Loading chunk 1 failed')).toBe(false)
    expect(isChunkLoadError({ message: 42 })).toBe(false)
  })
})

describe('reloadOnceForChunkError', () => {
  const reload = jest.fn()
  beforeEach(() => {
    reload.mockClear()
    window.sessionStorage.clear()
  })

  it('lädt beim ersten Fehler neu und merkt sich den Zeitstempel', () => {
    expect(reloadOnceForChunkError(1_000_000, reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBe('1000000')
  })

  it('lädt innerhalb einer Minute nicht erneut (Schleifensperre)', () => {
    reloadOnceForChunkError(1_000_000, reload)
    reload.mockClear()
    expect(reloadOnceForChunkError(1_000_000 + CHUNK_RELOAD_MIN_INTERVAL_MS - 1, reload)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it('lädt nach Ablauf der Minute wieder neu', () => {
    reloadOnceForChunkError(1_000_000, reload)
    reload.mockClear()
    expect(reloadOnceForChunkError(1_000_000 + CHUNK_RELOAD_MIN_INTERVAL_MS, reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('ignoriert einen ungültigen gespeicherten Wert', () => {
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, 'kaputt')
    expect(reloadOnceForChunkError(5_000_000, reload)).toBe(true)
  })

  it('lädt nicht neu, wenn sessionStorage nicht nutzbar ist', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(reloadOnceForChunkError(1_000_000, reload)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
