/**
 * T-22.2 Article Published Email Template
 *
 * Sent to subscribers when a new article is published in their subscribed categories.
 * Table-based layout for Outlook compatibility — NO CSS Grid, NO flexbox.
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface ArticlePublishedProps {
  tenantName: string;
  tenantLogoUrl: string;
  siteUrl: string;
  articleTitle: string;
  articleSlug: string;
  articleDescription: string;
  authorName: string;
  categoryName: string;
  readTimeMinutes: number;
  heroImageUrl: string | null;
  audioUrl: string | null;
  publishedAt: string;
  subscriberId: string;
  unsubscribeUrl: string;
}

export function ArticlePublished({
  tenantName = 'Ascendion Engineering',
  tenantLogoUrl = 'https://ascendion.engineering/logo.png',
  siteUrl = 'https://ascendion.engineering',
  articleTitle = 'Building Cloud-Native Applications with AWS',
  articleSlug = 'building-cloud-native-apps',
  articleDescription = 'A deep dive into microservices patterns and deployment strategies.',
  authorName = 'Priya Sharma',
  categoryName = 'Cloud Architecture',
  readTimeMinutes = 8,
  heroImageUrl = null,
  audioUrl = null,
  publishedAt = '2026-04-07T10:00:00Z',
  subscriberId = 'sub-preview',
  unsubscribeUrl = '#',
}: ArticlePublishedProps) {
  const articleUrl = `${siteUrl}/articles/${articleSlug}`;
  const formattedDate = new Date(publishedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Html>
      <Head />
      <Preview>New article: {articleTitle}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
              <tbody>
                <tr>
                  <td align="center" style={{ padding: '20px 0' }}>
                    <Img src={tenantLogoUrl} width="160" height="36" alt={tenantName} />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Badge */}
          <Section style={{ padding: '24px 24px 0' }}>
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
              <tbody>
                <tr>
                  <td style={badgeStyle}>New Article Published</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Article Card */}
          <Section style={{ padding: '16px 24px' }}>
            {heroImageUrl && (
              <Img src={heroImageUrl} width="552" alt="" style={{ borderRadius: '8px', marginBottom: '16px', width: '100%' }} />
            )}
            <Link href={articleUrl} style={{ textDecoration: 'none' }}>
              <Heading style={titleStyle}>{articleTitle}</Heading>
            </Link>
            <Text style={descStyle}>{articleDescription}</Text>
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
              <tbody>
                <tr>
                  <td style={metaStyle}>
                    By {authorName} · {categoryName} · {readTimeMinutes} min read · {formattedDate}
                    {audioUrl && ' · 🎧 Audio available'}
                  </td>
                </tr>
              </tbody>
            </table>
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const, marginTop: '16px' }}>
              <tbody>
                <tr>
                  <td>
                    <Link href={articleUrl} style={btnStyle}>Read Article →</Link>
                  </td>
                  {audioUrl && (
                    <td style={{ paddingLeft: '12px' }}>
                      <Link href={`${articleUrl}#audio`} style={btnSecondaryStyle}>🎧 Listen</Link>
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={dividerStyle} />

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              You received this because you're subscribed to {categoryName} articles on {tenantName}.
            </Text>
            <Link href={unsubscribeUrl} style={footerLinkStyle}>Unsubscribe</Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
const headerStyle: React.CSSProperties = { backgroundColor: '#0f172a' };
const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#dbeafe',
  color: '#1d4ed8',
  fontSize: '11px',
  fontWeight: 700,
  padding: '4px 10px',
  borderRadius: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};
const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#0f172a',
  lineHeight: '30px',
  margin: '0 0 8px 0',
};
const descStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '22px',
  margin: '0 0 8px 0',
};
const metaStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  padding: '0',
};
const btnStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
};
const btnSecondaryStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#f1f5f9',
  color: '#475569',
  padding: '10px 20px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
};
const dividerStyle: React.CSSProperties = { borderColor: '#e5e7eb', margin: '0 24px' };
const footerStyle: React.CSSProperties = { padding: '16px 24px 24px', textAlign: 'center' as const };
const footerTextStyle: React.CSSProperties = { fontSize: '12px', color: '#9ca3af', margin: '0 0 8px 0' };
const footerLinkStyle: React.CSSProperties = { fontSize: '12px', color: '#2563eb', textDecoration: 'underline' };

export default ArticlePublished;
