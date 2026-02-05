import { Text, Section } from "@react-email/components";
import * as React from "react";
import {
  BaseLayout,
  EmailButton,
  InfoBox,
  DetailsTable,
  DetailRow,
  Divider,
  colors,
} from "./base-layout";

interface SupplierInviteEmailProps {
  magicLinkUrl: string;
  organisationName: string;
  expirationTime: string;
  contactName?: string;
}

export function SupplierInviteEmail({
  magicLinkUrl,
  organisationName,
  expirationTime,
  contactName,
}: SupplierInviteEmailProps) {
  const greeting = contactName ? `Dear ${contactName},` : "Hello,";

  return (
    <BaseLayout preview={`Welcome to GroupBus - Activate your ${organisationName} supplier account`}>
      {/* Welcome Banner */}
      <Section style={styles.welcomeBanner}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.welcomeBannerInner}>
              <span style={styles.welcomeIcon}>🎉</span>
              <span style={styles.welcomeText}>Welcome to GroupBus!</span>
            </td>
          </tr>
        </table>
      </Section>

      {/* Greeting */}
      <Text style={styles.greeting}>{greeting}</Text>

      {/* Introduction */}
      <Text style={styles.paragraph}>
        You&apos;ve been invited to join the GroupBus supplier network as{" "}
        <strong>{organisationName}</strong>. We&apos;re excited to have you on board!
      </Text>

      <Text style={styles.paragraph}>
        GroupBus connects coach and bus operators like you with customers looking for
        reliable transport solutions. As a supplier partner, you&apos;ll receive qualified
        job opportunities matched to your fleet capabilities.
      </Text>

      {/* Organisation Details */}
      <DetailsTable title="Your Organisation">
        <DetailRow icon="&#127970;" label="Company Name" value={organisationName} />
        <DetailRow icon="&#128188;" label="Account Type" value="Supplier Partner" />
        <DetailRow icon="&#9989;" label="Status" value="Pending Activation" />
      </DetailsTable>

      {/* What you get section */}
      <Section style={styles.benefitsSection}>
        <Text style={styles.benefitsTitle}>What You&apos;ll Get</Text>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.benefitItem}>
              <span style={styles.benefitIcon}>📋</span>
              <span style={styles.benefitText}>Qualified job opportunities sent directly to you</span>
            </td>
          </tr>
          <tr>
            <td style={styles.benefitItem}>
              <span style={styles.benefitIcon}>💰</span>
              <span style={styles.benefitText}>Competitive pricing with transparent terms</span>
            </td>
          </tr>
          <tr>
            <td style={styles.benefitItem}>
              <span style={styles.benefitIcon}>📱</span>
              <span style={styles.benefitText}>Easy-to-use portal for managing bookings</span>
            </td>
          </tr>
          <tr>
            <td style={styles.benefitItem}>
              <span style={styles.benefitIcon}>⭐</span>
              <span style={styles.benefitText}>Build your reputation with customer reviews</span>
            </td>
          </tr>
        </table>
      </Section>

      {/* CTA Button */}
      <EmailButton href={magicLinkUrl} variant="success">
        Activate Your Supplier Account
      </EmailButton>

      {/* Expiration Notice */}
      <InfoBox variant="warning" icon="&#9202;">
        <strong>Invitation expires in {expirationTime}</strong>
        <br />
        Please activate your account before the link expires. If you need a new invitation,
        contact the GroupBus team.
      </InfoBox>

      <Divider />

      {/* Next Steps */}
      <Section style={styles.nextStepsSection}>
        <Text style={styles.nextStepsTitle}>After Activation</Text>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.stepNumber}>1</td>
            <td style={styles.stepContent}>
              <strong>Complete Your Profile</strong>
              <br />
              <span style={styles.stepDesc}>Add your fleet details and service areas</span>
            </td>
          </tr>
          <tr>
            <td style={styles.stepNumber}>2</td>
            <td style={styles.stepContent}>
              <strong>Upload Documents</strong>
              <br />
              <span style={styles.stepDesc}>Insurance, licenses, and compliance certificates</span>
            </td>
          </tr>
          <tr>
            <td style={styles.stepNumber}>3</td>
            <td style={styles.stepContent}>
              <strong>Start Receiving Jobs</strong>
              <br />
              <span style={styles.stepDesc}>Get notified of opportunities matching your fleet</span>
            </td>
          </tr>
        </table>
      </Section>

      {/* Alternative Link */}
      <Section style={styles.alternativeSection}>
        <Text style={styles.alternativeTitle}>
          Button not working? Copy and paste this link:
        </Text>
        <Text style={styles.alternativeLink}>{magicLinkUrl}</Text>
      </Section>

      <Divider />

      {/* Closing */}
      <Text style={styles.paragraph}>
        Have questions? Our supplier success team is here to help you get started.
        Simply reply to this email or call us on <strong>0800 123 4567</strong>.
      </Text>

      <Text style={styles.signature}>
        Welcome aboard!
        <br />
        <strong>The GroupBus Team</strong>
      </Text>
    </BaseLayout>
  );
}

const styles = {
  welcomeBanner: {
    margin: "0 0 24px 0",
  },
  welcomeBannerInner: {
    backgroundColor: "#ecfdf5",
    borderRadius: "8px",
    padding: "20px",
    textAlign: "center" as const,
  },
  welcomeIcon: {
    display: "inline-block",
    fontSize: "32px",
    marginRight: "12px",
    verticalAlign: "middle",
  },
  welcomeText: {
    fontSize: "24px",
    fontWeight: "700" as const,
    color: "#059669",
    verticalAlign: "middle",
  },
  greeting: {
    fontSize: "18px",
    color: colors.text,
    margin: "0 0 16px 0",
  },
  paragraph: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: colors.text,
    margin: "0 0 16px 0",
  },
  benefitsSection: {
    margin: "24px 0",
    backgroundColor: colors.background,
    borderRadius: "8px",
    padding: "20px",
  },
  benefitsTitle: {
    fontSize: "16px",
    fontWeight: "600" as const,
    color: colors.text,
    margin: "0 0 16px 0",
  },
  benefitItem: {
    padding: "8px 0",
  },
  benefitIcon: {
    display: "inline-block",
    marginRight: "12px",
    fontSize: "18px",
    verticalAlign: "middle",
  },
  benefitText: {
    fontSize: "14px",
    color: colors.text,
    verticalAlign: "middle",
  },
  nextStepsSection: {
    margin: "24px 0",
    backgroundColor: colors.background,
    borderRadius: "8px",
    padding: "20px",
  },
  nextStepsTitle: {
    fontSize: "16px",
    fontWeight: "600" as const,
    color: colors.text,
    margin: "0 0 16px 0",
  },
  stepNumber: {
    width: "32px",
    height: "32px",
    backgroundColor: colors.primary,
    color: "#ffffff",
    borderRadius: "50%",
    textAlign: "center" as const,
    fontSize: "14px",
    fontWeight: "700" as const,
    lineHeight: "32px",
    verticalAlign: "top",
  },
  stepContent: {
    paddingLeft: "16px",
    paddingBottom: "16px",
    fontSize: "14px",
    color: colors.text,
    verticalAlign: "top",
  },
  stepDesc: {
    color: colors.textMuted,
    fontSize: "13px",
  },
  alternativeSection: {
    margin: "20px 0",
    padding: "16px",
    backgroundColor: colors.background,
    borderRadius: "8px",
  },
  alternativeTitle: {
    fontSize: "13px",
    color: colors.textMuted,
    margin: "0 0 8px 0",
  },
  alternativeLink: {
    fontSize: "12px",
    color: colors.primary,
    wordBreak: "break-all" as const,
    fontFamily: "monospace",
    margin: 0,
  },
  signature: {
    fontSize: "15px",
    color: colors.text,
    margin: "24px 0 0 0",
    lineHeight: "1.6",
  },
};

export default SupplierInviteEmail;
