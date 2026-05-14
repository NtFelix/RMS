import { MetadataRoute } from 'next'
import { ROUTES } from '@/lib/constants'

// Required for Cloudflare Pages deployment
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mietevo.de'

    if (process.env.ROBOTS_INDEXING === 'false') {
        return {
            rules: [
                {
                    userAgent: '*',
                    disallow: '/',
                },
            ],
        }
    }

    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/auth/login',
                    '/auth/register',
                ],
                disallow: [
                    '/api/',
                    // Sensitive auth pages - keep out of search
                    '/auth/reset-password/',
                    '/auth/verify-email/',
                    '/auth/update-password/',
                    '/auth/callback/',
                    // Private dashboard pages
                    `${ROUTES.HOME}/`,
                    '/haeuser/',
                    '/wohnungen/',
                    '/mieter/',
                    '/finanzen/',
                    '/betriebskosten/',
                    '/dateien/',
                    '/todos/',
                    '/mail/',
                    '/vorlagen/',
                    // Other private pages
                    '/subscription-locked/',
                    '/checkout/',
                ],
            },
        ],
        sitemap: new URL('/sitemap.xml', baseUrl).toString(),
    }
}
