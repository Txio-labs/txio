import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

/** Signed-in and utility routes are kept out of search and AI indexes. */
const PRIVATE_PATHS = ['/api/', '/workspace', '/signin', '/signup', '/otp', '/desktop-auth'];

/** Search and answer-engine crawlers that should be able to cite the public pages. */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
];

export default function robots(): MetadataRoute.Robots {
  const rule = { allow: '/', disallow: PRIVATE_PATHS };
  return {
    rules: [{ userAgent: '*', ...rule }, ...AI_CRAWLERS.map((userAgent) => ({ userAgent, ...rule }))],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
