import robots from '@/app/robots'
import { defaultMetadata, pageMetadata, privateNoindexMetadata } from '@/lib/seo'

describe('SEO & Metadata Configuration', () => {
    describe('defaultMetadata', () => {
        it('should NOT define a global default canonical to avoid false duplicates', () => {
            expect(defaultMetadata.alternates?.canonical).toBeUndefined()
        })
    })

    describe('pageMetadata for waitlist pages', () => {
        it('should define distinct title and canonical for browser-erweiterung', () => {
            expect(pageMetadata.wartelisteBrowserErweiterung.title).toContain('Browser-Erweiterung')
            expect(pageMetadata.wartelisteBrowserErweiterung.alternates?.canonical).toBe('/warteliste/browser-erweiterung')
        })

        it('should define distinct title and canonical for mobile-app', () => {
            expect(pageMetadata.wartelisteMobileApp.title).toContain('Mobile App')
            expect(pageMetadata.wartelisteMobileApp.alternates?.canonical).toBe('/warteliste/mobile-app')
        })
    })

    describe('privateNoindexMetadata', () => {
        it('should have index: false and follow: false', () => {
            expect(privateNoindexMetadata.robots).toEqual(
                expect.objectContaining({
                    index: false,
                    follow: false,
                    nocache: true,
                })
            )
        })
    })

    describe('robots() configuration', () => {
        it('should only disallow /api/ and keep private pages crawlable for noindex visibility', () => {
            const robotsResult = robots()
            const rules = Array.isArray(robotsResult.rules) ? robotsResult.rules[0] : robotsResult.rules

            expect(rules).toBeDefined()
            expect(rules?.disallow).toEqual(['/api/'])
            expect(rules?.allow).toEqual(['/', '/auth/login', '/auth/register'])
        })

        it('should disallow / when ROBOTS_INDEXING is false', () => {
            const originalEnv = process.env.ROBOTS_INDEXING
            process.env.ROBOTS_INDEXING = 'false'
            try {
                const robotsResult = robots()
                const rules = Array.isArray(robotsResult.rules) ? robotsResult.rules[0] : robotsResult.rules
                expect(rules?.disallow).toBe('/')
            } finally {
                process.env.ROBOTS_INDEXING = originalEnv
            }
        })
    })
})
