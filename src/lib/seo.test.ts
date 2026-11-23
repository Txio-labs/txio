import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { FAQ, faqJsonLd, jsonLdScript, organizationJsonLd, SITE_URL } from './seo';

describe('seo', () => {
  it('escapes < so JSON-LD cannot close its script tag', () => {
    const out = jsonLdScript({ text: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out).text).toBe('</script><script>alert(1)</script>');
  });

  it('builds one FAQPage question per FAQ entry, with matching text', () => {
    const json = faqJsonLd();
    expect(json.mainEntity).toHaveLength(FAQ.length);
    json.mainEntity.forEach((q, i) => {
      expect(q.name).toBe(FAQ[i].question);
      expect(q.acceptedAnswer.text).toBe(FAQ[i].answer);
    });
  });

  it('describes the organization, website and software in one graph', () => {
    const types = organizationJsonLd()['@graph'].map((n) => n['@type']);
    expect(types).toEqual(['Organization', 'WebSite', 'SoftwareApplication']);
  });

  it('keeps authenticated routes out of robots and allows AI crawlers on public pages', () => {
    const rules = robots().rules as Array<{ userAgent: string; allow: string; disallow: string[] }>;
    const agents = rules.map((r) => r.userAgent);
    expect(agents).toEqual(expect.arrayContaining(['*', 'GPTBot', 'ClaudeBot', 'PerplexityBot']));
    for (const rule of rules) {
      expect(rule.allow).toBe('/');
      expect(rule.disallow).toEqual(expect.arrayContaining(['/workspace', '/api/']));
    }
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('lists the public marketing pages in the sitemap', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/`);
    expect(urls).toContain(`${SITE_URL}/features`);
    expect(urls.some((u) => u.includes('/workspace'))).toBe(false);
  });
});
