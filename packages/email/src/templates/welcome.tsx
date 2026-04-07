/**
 * T-22.2 Welcome Email Template
 *
 * Sent to new users when they sign up or are provisioned via SCIM.
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

export interface WelcomeProps {
  tenantName: string;
  tenantLogoUrl: string;
  siteUrl: string;
  userName: string;
  userEmail: string;
  role: string;
  loginUrl: string;
  mobileAppUrl: string;
}

export function Welcome({
  tenantName = 'Ascendion Engineering',
  tenantLogoUrl = 'https://ascendion.engineering/logo.png',
  siteUrl = 'https://ascendion.engineering',
  userName = 'New User',
  userEmail = 'user@example.com',
  role = 'reader',
  loginUrl = '#',
  mobileAppUrl = '#',
}: WelcomeProps) {
  const isCreator = role === 'creator' || role === 'admin';

  return (
    <Html>
      <Head />
      <Preview>Welcome to {tenantName}!</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
              <tbody>
                <tr>
                  <td align="center" style={{ padding: '28px 0' }}>
                    <Img src={tenantLogoUrl} width="180" height="40" alt={tenantName} />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={{ padding: '28px 24px' }}>
            <Heading style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Welcome, {userName}! 👋
            </Heading>
            <Text style={{ fontSize: '14px', color: '#475569', lineHeight: '22px', margin: '0 0 20px 0' }}>
              Your account has been set up on <strong>{tenantName}</strong> as a <strong>{role}</strong>.
              {isCreator
                ? " You can read articles, create content using our AI-powered editor, and record voice articles."
                : " You can browse articles, listen to audio versions, and search our knowledge base."}
            </Text>

            {/* Getting Started */}
            <Heading style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 12px 0' }}>
              Getting Started
            </Heading>

            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
              <tbody>
                {/* Step 1 */}
                <tr>
                  <td style={stepNumberStyle}>1</td>
                  <td style={stepTextStyle}>
                    <strong>Sign in</strong> — Use your corporate SSO or the credentials sent separately.
                  </td>
                </tr>
                {/* Step 2 */}
                <tr>
                  <td style={stepNumberStyle}>2</td>
                  <td style={stepTextStyle}>
                    <strong>Browse content</strong> — Explore articles organized by category with search and audio.
                  </td>
                </tr>
                {/* Step 3 */}
                {isCreator && (
                  <tr>
                    <td style={stepNumberStyle}>3</td>
                    <td style={stepTextStyle}>
                      <strong>Create content</strong> — Open the AI Workspace to write articles or record voice content.
                    </td>
                  </tr>
                )}
                {/* Mobile */}
                <tr>
                  <td style={stepNumberStyle}>{isCreator ? '4' : '3'}</td>
                  <td style={stepTextStyle}>
                    <strong>Download the app</strong> — Read on the go and record voice articles from your phone.
                  </td>
                </tr>
              </tbody>
            </table>

            {/* CTA */}
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const, marginTop: '24px' }}>
              <tbody>
                <tr>
                  <td>
                    <Link href={loginUrl} style={btnStyle}>Sign In to {tenantName} →</Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '0 24px' }} />

          <Section style={{ padding: '16px 24px', backgroundColor: '#f8fafc' }}>
            <Text style={{ fontSize: '13px', color: '#475569', lineHeight: '20px', margin: '0 0 8px 0' }}>
              <strong>Your account details:</strong>
            </Text>
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const }}>
              <tbody>
                <tr>
                  <td style={{ fontSize: '12px', color: '#64748b', padding: '2px 0' }}>Email: {userEmail}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: '12px', color: '#64748b', padding: '2px 0' }}>Role: {role}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: '12px', color: '#64748b', padding: '2px 0' }}>Portal: <Link href={siteUrl} style={{ color: '#2563eb' }}>{siteUrl}</Link></td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={{ padding: '16px 24px 24px', textAlign: 'center' as const }}>
            <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              This email was sent by {tenantName}. If you didn't expect this, please contact your administrator.
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
const stepNumberStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  borderRadius: '50%',
  textAlign: 'center' as const,
  fontSize: '13px',
  fontWeight: 700,
  verticalAlign: 'top',
  paddingTop: '5px',
};
const stepTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#475569',
  lineHeight: '20px',
  paddingLeft: '12px',
  paddingBottom: '12px',
  verticalAlign: 'top',
};
const btnStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
};

export default Welcome;
