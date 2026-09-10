import axios from 'axios';
import * as cheerio from 'cheerio';
import URL from 'url';

export interface CrawlResult {
  summary: string;
  what_they_do: string;
  sources: string[];
  pages_used: string[];
}

export function isPrivateIP(urlStr: string): boolean {
  try {
    const parsed = new URL.URL(urlStr);
    const hostname = parsed.hostname;

    if (process.env.ALLOW_LOCALHOST === 'true' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return false; // Allowed in dev/batch testing mode
    }

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.')
    ) {
      return true; // Reject SSRF private range
    }
  } catch (err) {
    return true; // Invalid URL is dangerous
  }
  return false;
}

export async function crawlCompanySite(companyUrl: string): Promise<CrawlResult> {
  const sourcesTried: string[] = [];
  const pagesUsed: string[] = [];

  if (!companyUrl || !companyUrl.startsWith('http')) {
    return {
      summary: 'Company website URL missing or invalid.',
      what_they_do: 'Unable to retrieve company information.',
      sources: sourcesTried,
      pages_used: pagesUsed
    };
  }

  if (isPrivateIP(companyUrl)) {
    return {
      summary: 'Private or local IP restricted for safety.',
      what_they_do: 'Company site could not be accessed directly.',
      sources: [companyUrl],
      pages_used: []
    };
  }

  sourcesTried.push(companyUrl);

  try {
    const response = await axios.get(companyUrl, {
      timeout: 6000,
      headers: {
        'User-Agent': 'Trao-PrepKit-Bot/1.0 (+https://trao.io)'
      },
      maxContentLength: 2 * 1024 * 1024 // 2MB limit
    });

    if (response.status === 200) {
      pagesUsed.push(companyUrl);
      const $ = cheerio.load(response.data);

      // Extract text content
      const title = $('title').text().trim() || 'Company';
      const metaDesc = $('meta[name="description"]').attr('content') || '';
      const bodyText = $('body').text().replace(/\s+/g, ' ').substring(0, 1500);

      // Extract internal links and rank them
      const internalLinks: string[] = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const absolute = new URL.URL(href, companyUrl).toString();
            if (absolute.startsWith(companyUrl) && !internalLinks.includes(absolute)) {
              internalLinks.push(absolute);
            }
          } catch (e) {
            // Ignore invalid URL
          }
        }
      });

      // Rank links by hiring/career/about keywords
      const rankedLinks = internalLinks.sort((a, b) => {
        const score = (url: string) => {
          const u = url.toLowerCase();
          if (u.includes('career') || u.includes('job') || u.includes('hiring') || u.includes('work-with-us')) return 3;
          if (u.includes('about') || u.includes('handbook') || u.includes('culture') || u.includes('team')) return 2;
          if (u.includes('blog') || u.includes('engineering')) return 1;
          return 0;
        };
        return score(b) - score(a);
      });

      // Try fetching top ranked link
      if (rankedLinks.length > 0 && rankedLinks[0] !== companyUrl) {
        const topLink = rankedLinks[0];
        sourcesTried.push(topLink);
        try {
          const subRes = await axios.get(topLink, { timeout: 4000 });
          if (subRes.status === 200) {
            pagesUsed.push(topLink);
          }
        } catch (e) {
          // Log failed source silently without throwing
        }
      }

      return {
        summary: `${title}. ${metaDesc}`.trim(),
        what_they_do: bodyText.substring(0, 600) + '...',
        sources: sourcesTried,
        pages_used: pagesUsed
      };
    }
  } catch (err: any) {
    console.warn(`Crawler warning for ${companyUrl}: ${err.message}`);
  }

  return {
    summary: 'Company details could not be retrieved from site (site unreachable or timeout).',
    what_they_do: 'No public information discovered from provided URL.',
    sources: sourcesTried,
    pages_used: pagesUsed
  };
}
