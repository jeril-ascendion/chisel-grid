import { getArticles } from '@/lib/mock-data';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/utils';

export const revalidate = 3600;

export async function GET() {
  const { items: articles } = getArticles({ limit: 50 });

  const rssItems = articles
    .map(
      (article) => `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${SITE_URL}/articles/${article.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/articles/${article.slug}</guid>
      <description><![CDATA[${article.description}]]></description>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
      <category>${article.categoryName}</category>
      <author>${article.authorName}</author>
    </item>`,
    )
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
