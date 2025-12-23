import { MetadataRoute } from 'next'

// Required for Cloudflare Pages deployment
export const runtime = 'edge'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/auth/',
                    '/home/',
                    '/onboarding/',
                    '/subscription-locked/',
                    '/checkout/',
                    '/test-mobile-nav/',
                    '/test-responsive-nav/',
                ],
            },
        ],
        sitemap: 'https://mietevo.de/sitemap.xml',
    }
}
