import { MetadataRoute } from 'next'

// Required for Cloudflare Pages deployment
export const runtime = 'edge'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mietevo.de'

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
                ],
            },
        ],
        sitemap: new URL('/sitemap.xml', baseUrl).toString(),
    }
}
