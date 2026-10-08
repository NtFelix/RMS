import { MetadataRoute } from 'next'

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
                ],
            },
        ],
        sitemap: new URL('/sitemap.xml', baseUrl).toString(),
    }
}
