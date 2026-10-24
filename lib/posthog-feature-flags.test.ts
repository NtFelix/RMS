/** @jest-environment node */

import { POSTHOG_FEATURE_FLAGS } from './constants'

jest.mock('next/cache', () => ({
    cacheLife: jest.fn(),
    cacheTag: jest.fn(),
}))

const ORIGINAL_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

// The module reads NEXT_PUBLIC_POSTHOG_KEY at load time, so each test loads a fresh copy
function loadModule(key: string | undefined): typeof import('./posthog-feature-flags') {
    if (key === undefined) {
        delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    } else {
        process.env.NEXT_PUBLIC_POSTHOG_KEY = key
    }
    jest.resetModules()
    return require('./posthog-feature-flags')
}

const ORIGINAL_FETCH = global.fetch

describe('getFeatureFlagsForSEO', () => {
    let fetchMock: jest.Mock
    let warnSpy: jest.SpyInstance
    let logSpy: jest.SpyInstance
    let errorSpy: jest.SpyInstance

    beforeEach(() => {
        fetchMock = jest.fn()
        global.fetch = fetchMock as unknown as typeof fetch
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        jest.restoreAllMocks()
        global.fetch = ORIGINAL_FETCH
        if (ORIGINAL_KEY === undefined) {
            delete process.env.NEXT_PUBLIC_POSTHOG_KEY
        } else {
            process.env.NEXT_PUBLIC_POSTHOG_KEY = ORIGINAL_KEY
        }
    })

    it('returns all-false defaults without fetching when no API key is set', async () => {
        const { getFeatureFlagsForSEO } = loadModule(undefined)

        const result = await getFeatureFlagsForSEO()

        expect(result).toEqual({ showLoesungen: false, showProdukte: false })
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('warns about a missing API key only once per process', async () => {
        const { getFeatureFlagsForSEO } = loadModule(undefined)

        await getFeatureFlagsForSEO()
        await getFeatureFlagsForSEO()
        await getFeatureFlagsForSEO()

        expect(warnSpy).toHaveBeenCalledTimes(1)
    })

    it('maps PostHog flags to booleans and tags the cache entry', async () => {
        const { getFeatureFlagsForSEO } = loadModule('phc_test_key')
        const cache = require('next/cache')
        fetchMock.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                featureFlags: {
                    [POSTHOG_FEATURE_FLAGS.SHOW_LOESUNGEN_DROPDOWN]: true,
                    [POSTHOG_FEATURE_FLAGS.SHOW_PRODUKTE_DROPDOWN]: false,
                },
            }),
        })

        const result = await getFeatureFlagsForSEO()

        expect(result).toEqual({ showLoesungen: true, showProdukte: false })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(cache.cacheTag).toHaveBeenCalledWith('posthog:flags:seo')
        expect(cache.cacheLife).toHaveBeenCalledWith('hours')
    })

    it('passes an abort signal so a hanging PostHog request cannot stall prerendering', async () => {
        const { getFeatureFlagsForSEO } = loadModule('phc_test_key')
        fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ featureFlags: {} }) })

        await getFeatureFlagsForSEO()

        expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
    })

    it('returns all-false defaults instead of throwing when fetch rejects', async () => {
        const { getFeatureFlagsForSEO } = loadModule('phc_test_key')
        const cache = require('next/cache')
        fetchMock.mockRejectedValue(new TypeError('network down'))

        await expect(getFeatureFlagsForSEO()).resolves.toEqual({ showLoesungen: false, showProdukte: false })
        expect(warnSpy).toHaveBeenCalled()
        expect(cache.cacheTag).toHaveBeenCalledWith('posthog:flags:seo')
        // The fallback must only be cached briefly, never for hours
        expect(cache.cacheLife).toHaveBeenCalledWith('minutes')
        expect(cache.cacheLife).not.toHaveBeenCalledWith('hours')
    })

    it('returns all-false defaults when the response body cannot be parsed', async () => {
        const { getFeatureFlagsForSEO } = loadModule('phc_test_key')
        const cache = require('next/cache')
        fetchMock.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => {
                throw new SyntaxError('Unexpected token')
            },
        })

        await expect(getFeatureFlagsForSEO()).resolves.toEqual({ showLoesungen: false, showProdukte: false })
        expect(cache.cacheLife).toHaveBeenCalledWith('minutes')
        expect(cache.cacheLife).not.toHaveBeenCalledWith('hours')
    })

    it('treats a response without featureFlags as all flags disabled', async () => {
        const { getFeatureFlagsForSEO } = loadModule('phc_test_key')
        fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })

        await expect(getFeatureFlagsForSEO()).resolves.toEqual({ showLoesungen: false, showProdukte: false })
    })

    it('keeps the last known flags when a later request fails', async () => {
        const { getFeatureFlagsForSEO } = loadModule('phc_test_key')
        const cache = require('next/cache')
        fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                featureFlags: {
                    [POSTHOG_FEATURE_FLAGS.SHOW_LOESUNGEN_DROPDOWN]: true,
                    [POSTHOG_FEATURE_FLAGS.SHOW_PRODUKTE_DROPDOWN]: true,
                },
            }),
        })
        await getFeatureFlagsForSEO()

        fetchMock.mockRejectedValueOnce(new TypeError('network down'))
        await expect(getFeatureFlagsForSEO()).resolves.toEqual({ showLoesungen: true, showProdukte: true })
        expect(cache.cacheLife).toHaveBeenLastCalledWith('minutes')

        fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
        await expect(getFeatureFlagsForSEO()).resolves.toEqual({ showLoesungen: true, showProdukte: true })
    })

    it('returns all-false defaults when the response is not ok', async () => {
        const { getFeatureFlagsForSEO } = loadModule('phc_test_key')
        const cache = require('next/cache')
        fetchMock.mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({}),
        })

        await expect(getFeatureFlagsForSEO()).resolves.toEqual({ showLoesungen: false, showProdukte: false })
        expect(warnSpy).toHaveBeenCalled()
        expect(cache.cacheTag).toHaveBeenCalledWith('posthog:flags:seo')
        expect(cache.cacheLife).toHaveBeenCalledWith('minutes')
        expect(cache.cacheLife).not.toHaveBeenCalledWith('hours')
    })
})
