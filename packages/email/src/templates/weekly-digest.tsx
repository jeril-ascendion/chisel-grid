import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface DigestArticle {
  title: string;
  slug: string;
  description: string;
  authorName: string;
  categoryName: string;
  readTimeMinutes: number;
  heroImageUrl: string | null;
  audioUrl: string | null;
  publishedAt: string;
}

export interface WeeklyDigestProps {
  tenantName: string;
  tenantLogoUrl: string;
  siteUrl: string;
  weekStartDate: string;
  weekEndDate: string;
  featuredArticle: DigestArticle;
  articles: DigestArticle[];
  subscriberId: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
}

/**
 * Weekly Digest email template.
 * Uses table-based layout for Outlook compatibility — NO CSS Grid, NO flexbox.
 */
export function WeeklyDigest({
  tenantName = 'Ascendion Engineering',
  tenantLogoUrl = 'https://ascendion.engineering/logo.png',
  siteUrl = 'https://ascendion.engineering',
  weekStartDate = 'March 31, 2026',
  weekEndDate = 'April 6, 2026',
  featuredArticle = {
    title: 'Building Cloud-Native Applications with AWS',
    slug: 'building-cloud-native-applications-aws',
    description: 'A deep dive into microservices communication, deployment strategies, and observability.',
    authorName: 'Priya Sharma',
    categoryName: 'Cloud Architecture',
    readTimeMinutes: 8,
    heroImageUrl: null,
    audioUrl: '/mock-audio.mp3',
    publishedAt: '2026-04-01T10:00:00Z',
  },
  articles = [],
  subscriberId = 'sub-preview',
  unsubscribeUrl = '#',
  preferencesUrl = '#',
}: WeeklyDigestProps) {
  const previewText = `${tenantName} Weekly Digest — ${weekStartDate} to ${weekEndDate}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
              <tbody>
                <tr>
                  <td align="center" style={{ padding: '24px 0' }}>
                    <Img
                      src={tenantLogoUrl}
                      width="180"
                      height="40"
                      alt={tenantName}
                      style={{ display: 'block', margin: '0 auto' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Title */}
          <Section style={{ padding: '0 24px' }}>
            <Heading style={titleStyle}>Weekly Digest</Heading>
            <Text style={dateRangeStyle}>
              {weekStartDate} — {weekEndDate}
            </Text>
          </Section>

          <Hr style={dividerStyle} />

          {/* Featured Article */}
          <Section style={{ padding: '0 24px' }}>
            <Text style={sectionLabelStyle}>FEATURED</Text>
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
              <tbody>
                <tr>
                  <td style={featuredCardStyle}>
                    <Link href={`${siteUrl}/articles/${featuredArticle.slug}`} style={{ textDecoration: 'none' }}>
                      <Text style={featuredTitleStyle}>{featuredArticle.title}</Text>
                    </Link>
                    <Text style={featuredDescStyle}>{featuredArticle.description}</Text>
                    <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
                      <tbody>
                        <tr>
                          <td style={metaStyle}>
                            {featuredArticle.authorName} · {featuredArticle.categoryName} · {featuredArticle.readTimeMinutes} min read
                            {featuredArticle.audioUrl && ' · 🎧 Audio available'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <Link href={`${siteUrl}/articles/${featuredArticle.slug}`} style={readMoreBtnStyle}>
                      Read Article →
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={dividerStyle} />

          {/* Article List */}
          {articles.length > 0 && (
            <Section style={{ padding: '0 24px' }}>
              <Text style={sectionLabelStyle}>MORE THIS WEEK</Text>
              <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
                <tbody>
                  {articles.map((article, index) => (
                    <tr key={article.slug}>
                      <td style={articleRowStyle}>
                        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '0', verticalAlign: 'top' as const }}>
                                <Link href={`${siteUrl}/articles/${article.slug}`} style={{ textDecoration: 'none' }}>
                                  <Text style={articleTitleStyle}>{article.title}</Text>
                                </Link>
                                <Text style={articleDescStyle}>{article.description}</Text>
                                <Text style={articleMetaStyle}>
                                  {article.authorName} · {article.readTimeMinutes} min read
                                  {article.audioUrl && ' · 🎧'}
                                </Text>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        {index < articles.length - 1 && <Hr style={thinDividerStyle} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          <Hr style={dividerStyle} />

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              You received this email because you're subscribed to {tenantName} Weekly Digest.
            </Text>
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
              <tbody>
                <tr>
                  <td align="center" style={{ padding: '8px 0' }}>
                    <Link href={preferencesUrl} style={footerLinkStyle}>
                      Manage Preferences
                    </Link>
                    <Text style={{ display: 'inline', color: '#9ca3af', margin: '0 8px' }}> · </Text>
                    <Link href={unsubscribeUrl} style={footerLinkStyle}>
                      Unsubscribe
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
            <Text style={footerIdStyle}>Subscriber ID: {subscriberId}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles — all inline for email client compatibility
const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const containerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  maxWidth: '600px',
  margin: '0 auto',
  borderRadius: '8px',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  padding: '0',
};

const titleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#0f172a',
  margin: '24px 0 4px 0',
  lineHeight: '32px',
};

const dateRangeStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 16px 0',
};

const dividerStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '0 24px',
};

const thinDividerStyle: React.CSSProperties = {
  borderColor: '#f3f4f6',
  margin: '12px 0',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#9ca3af',
  letterSpacing: '1.5px',
  margin: '20px 0 12px 0',
};

const featuredCardStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '20px',
  border: '1px solid #e2e8f0',
};

const featuredTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#0f172a',
  lineHeight: '28px',
  margin: '0 0 8px 0',
};

const featuredDescStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '22px',
  margin: '0 0 12px 0',
};

const metaStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  padding: '0 0 12px 0',
};

const readMoreBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
};

const articleRowStyle: React.CSSProperties = {
  padding: '8px 0',
};

const articleTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#0f172a',
  lineHeight: '24px',
  margin: '0 0 4px 0',
};

const articleDescStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '20px',
  margin: '0 0 4px 0',
};

const articleMetaStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '0',
};

const footerStyle: React.CSSProperties = {
  padding: '16px 24px 24px',
  textAlign: 'center' as const,
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  lineHeight: '18px',
  margin: '0 0 8px 0',
};

const footerLinkStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#2563eb',
  textDecoration: 'underline',
};

const footerIdStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#d1d5db',
  margin: '8px 0 0 0',
};

export default WeeklyDigest;
