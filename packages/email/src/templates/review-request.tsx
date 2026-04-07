/**
 * T-22.2 Review Request Email Template
 *
 * Sent to admins when content enters the review queue.
 * Table-based layout for Outlook compatibility.
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

export interface ReviewRequestProps {
  tenantName: string;
  tenantLogoUrl: string;
  siteUrl: string;
  contentTitle: string;
  contentId: string;
  authorName: string;
  categoryName: string;
  submittedAt: string;
  aiQualityScore: number;
  reviewUrl: string;
  reviewerName: string;
}

export function ReviewRequest({
  tenantName = 'Ascendion Engineering',
  tenantLogoUrl = 'https://ascendion.engineering/logo.png',
  siteUrl = 'https://ascendion.engineering',
  contentTitle = 'Building Cloud-Native Applications',
  contentId = 'content-123',
  authorName = 'Priya Sharma',
  categoryName = 'Cloud Architecture',
  submittedAt = '2026-04-07T10:00:00Z',
  aiQualityScore = 85,
  reviewUrl = '#',
  reviewerName = 'Admin',
}: ReviewRequestProps) {
  const formattedDate = new Date(submittedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const scoreColor = aiQualityScore >= 80 ? '#16a34a' : aiQualityScore >= 60 ? '#ca8a04' : '#dc2626';

  return (
    <Html>
      <Head />
      <Preview>Review requested: {contentTitle}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
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

          <Section style={{ padding: '24px' }}>
            <Text style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px 0' }}>
              Hi {reviewerName},
            </Text>
            <Heading style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
              Content Ready for Review
            </Heading>

            {/* Content details table */}
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const, backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '16px' }}>
                    <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
                      <tbody>
                        <tr>
                          <td style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', paddingBottom: '8px' }}>Title</td>
                        </tr>
                        <tr>
                          <td style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', paddingBottom: '12px' }}>{contentTitle}</td>
                        </tr>
                        <tr>
                          <td>
                            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
                              <tbody>
                                <tr>
                                  <td style={{ fontSize: '12px', color: '#64748b', paddingRight: '16px' }}>
                                    <strong>Author:</strong> {authorName}
                                  </td>
                                  <td style={{ fontSize: '12px', color: '#64748b', paddingRight: '16px' }}>
                                    <strong>Category:</strong> {categoryName}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ fontSize: '12px', color: '#64748b', paddingRight: '16px', paddingTop: '4px' }}>
                                    <strong>Submitted:</strong> {formattedDate}
                                  </td>
                                  <td style={{ fontSize: '12px', paddingTop: '4px' }}>
                                    <strong>AI Score:</strong>{' '}
                                    <span style={{ color: scoreColor, fontWeight: 700 }}>{aiQualityScore}/100</span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Action buttons */}
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const, marginTop: '20px' }}>
              <tbody>
                <tr>
                  <td>
                    <Link href={reviewUrl} style={btnStyle}>Review Content →</Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '0 24px' }} />

          <Section style={{ padding: '16px 24px 24px', textAlign: 'center' as const }}>
            <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              This is an automated notification from {tenantName}. Content ID: {contentId}
            </Text>
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
};
const containerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  maxWidth: '600px',
  margin: '0 auto',
  borderRadius: '8px',
  overflow: 'hidden',
};
const headerStyle: React.CSSProperties = { backgroundColor: '#0f172a' };
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

export default ReviewRequest;
