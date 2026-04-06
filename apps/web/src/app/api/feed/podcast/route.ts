import { getArticles } from '@/lib/mock-data';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/utils';

export const revalidate = 3600;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}:${String(mins).padStart(2, '0')}:00` : `${mins}:00`;
}

export async function GET() {
  const { items: allArticles } = getArticles({ limit: 200 });

  // Only include articles with audio
  const episodes = allArticles.filter((article) => article.audioUrl);

  const podcastImageUrl = `${SITE_URL}/podcast-cover.png`;
  const feedUrl = `${SITE_URL}/api/feed/podcast`;

  const episodeItems = episodes
    .map((article) => {
      const audioUrl = article.audioUrl!.startsWith('http')
        ? article.audioUrl!
        : `${SITE_URL}${article.audioUrl}`;
      const pubDate = new Date(article.publishedAt).toUTCString();
      const durationSeconds = (article.readTimeMinutes ?? 5) * 60;
      const duration = formatDuration(article.readTimeMinutes ?? 5);

      return `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${SITE_URL}/articles/${article.slug}</link>
      <guid isPermaLink="false">${article.contentId}</guid>
      <description><![CDATA[${article.description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(article.authorName)}</author>
      <enclosure url="${escapeXml(audioUrl)}" length="${durationSeconds * 16000}" type="audio/mpeg"/>
      <itunes:author>${escapeXml(article.authorName)}</itunes:author>
      <itunes:subtitle><![CDATA[${article.description.slice(0, 255)}]]></itunes:subtitle>
      <itunes:summary><![CDATA[${article.description}]]></itunes:summary>
      <itunes:duration>${duration}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:episode>${episodes.indexOf(article) + 1}</itunes:episode>
      <category>${escapeXml(article.categoryName)}</category>
    </item>`;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${SITE_NAME} Podcast</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en-us</language>
    <copyright>Copyright ${new Date().getFullYear()} ${SITE_NAME}</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <itunes:author>${SITE_NAME}</itunes:author>
    <itunes:summary>${escapeXml(SITE_DESCRIPTION)}</itunes:summary>
    <itunes:owner>
      <itunes:name>${SITE_NAME}</itunes:name>
      <itunes:email>podcast@ascendion.engineering</itunes:email>
    </itunes:owner>
    <itunes:image href="${podcastImageUrl}"/>
    <itunes:category text="Technology"/>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    <image>
      <url>${podcastImageUrl}</url>
      <title>${SITE_NAME} Podcast</title>
      <link>${SITE_URL}</link>
    </image>
${episodeItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
