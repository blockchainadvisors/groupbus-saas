import { Text, Section } from "@react-email/components";
import * as React from "react";
import { MagicLinkPurpose } from "@prisma/client";
import {
  BaseLayout,
  EmailButton,
  InfoBox,
  Divider,
  colors,
} from "./base-layout";

interface MagicLinkEmailProps {
  magicLinkUrl: string;
  expirationTime: string;
  purpose: MagicLinkPurpose;
  ipAddress?: string;
  userAgent?: string;
}

export function MagicLinkEmail({
  magicLinkUrl,
  expirationTime,
  purpose,
  ipAddress,
  userAgent,
}: MagicLinkEmailProps) {
  const config = getEmailConfig(purpose);

  return (
    <BaseLayout preview={config.preview}>
      {/* Header Banner */}
      <Section style={styles.banner}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.bannerInner}>
              <span style={styles.bannerIcon}>{config.icon}</span>
              <span style={styles.bannerText}>{config.heading}</span>
            </td>
          </tr>
        </table>
      </Section>

      {/* Introduction */}
      <Text style={styles.paragraph}>{config.intro}</Text>

      <Text style={styles.paragraph}>
        Click the button below to {config.action}. This link will expire in{" "}
        <strong>{expirationTime}</strong>.
      </Text>

      {/* CTA Button */}
      <EmailButton href={magicLinkUrl}>{config.buttonText}</EmailButton>

      {/* Expiration Notice */}
      <InfoBox variant="warning" icon="&#9202;">
        <strong>Link expires in {expirationTime}</strong>
        <br />
        For your security, this link can only be used once and will expire after{" "}
        {expirationTime}.
      </InfoBox>

      <Divider />

      {/* Security Info */}
      <Section style={styles.securitySection}>
        <Text style={styles.securityTitle}>Security Information</Text>
        {ipAddress && (
          <Text style={styles.securityText}>
            Request IP: <code style={styles.code}>{ipAddress}</code>
          </Text>
        )}
        {userAgent && (
          <Text style={styles.securityText}>
            Device: <code style={styles.code}>{userAgent}</code>
          </Text>
        )}
      </Section>

      {/* Warning */}
      <InfoBox variant="neutral" icon="&#128274;">
        <strong>Didn&apos;t request this?</strong>
        <br />
        If you didn&apos;t request this link, you can safely ignore this email.
        Your account is secure and no action is required.
      </InfoBox>

      {/* Alternative Link */}
      <Section style={styles.alternativeSection}>
        <Text style={styles.alternativeTitle}>
          Button not working? Copy and paste this link:
        </Text>
        <Text style={styles.alternativeLink}>{magicLinkUrl}</Text>
      </Section>

      <Divider />

      {/* Footer */}
      <Text style={styles.footerText}>
        This email was sent to you because someone requested a magic link for
        your GroupBus account. If you have any concerns, please contact our
        support team.
      </Text>
    </BaseLayout>
  );
}

function getEmailConfig(purpose: MagicLinkPurpose) {
  switch (purpose) {
    case MagicLinkPurpose.LOGIN:
      return {
        preview: "Sign in to your GroupBus account",
        icon: "🔐",
        heading: "Sign In Request",
        intro:
          "We received a request to sign in to your GroupBus account. Use the secure link below to access your account without a password.",
        action: "sign in to your account",
        buttonText: "Sign In to GroupBus",
      };
    case MagicLinkPurpose.ENQUIRY_ACCESS:
      return {
        preview: "Access your GroupBus dashboard",
        icon: "📋",
        heading: "Access Your Dashboard",
        intro:
          "You can now access your GroupBus dashboard to track your enquiry status, view quotes, and manage your bookings.",
        action: "access your dashboard",
        buttonText: "Access Your Dashboard",
      };
    case MagicLinkPurpose.SUPPLIER_ONBOARDING:
      return {
        preview: "Welcome to GroupBus - Activate your supplier account",
        icon: "🚌",
        heading: "Welcome to GroupBus!",
        intro:
          "You&apos;ve been invited to join GroupBus as a supplier partner. Click the link below to activate your account and start receiving job opportunities.",
        action: "activate your supplier account",
        buttonText: "Activate Your Account",
      };
    default:
      return {
        preview: "Sign in to GroupBus",
        icon: "🔐",
        heading: "Sign In",
        intro: "Click the link below to sign in to your GroupBus account.",
        action: "sign in",
        buttonText: "Sign In",
      };
  }
}

const styles = {
  banner: {
    margin: "0 0 24px 0",
  },
  bannerInner: {
    backgroundColor: "#eff6ff",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center" as const,
  },
  bannerIcon: {
    display: "inline-block",
    fontSize: "28px",
    marginRight: "12px",
    verticalAlign: "middle",
  },
  bannerText: {
    fontSize: "20px",
    fontWeight: "700" as const,
    color: colors.primary,
    verticalAlign: "middle",
  },
  paragraph: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: colors.text,
    margin: "0 0 16px 0",
  },
  securitySection: {
    margin: "20px 0",
    padding: "16px",
    backgroundColor: colors.background,
    borderRadius: "8px",
  },
  securityTitle: {
    fontSize: "14px",
    fontWeight: "600" as const,
    color: colors.text,
    margin: "0 0 12px 0",
  },
  securityText: {
    fontSize: "13px",
    color: colors.textMuted,
    margin: "0 0 8px 0",
  },
  code: {
    backgroundColor: "#e2e8f0",
    padding: "2px 6px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "12px",
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
  footerText: {
    fontSize: "12px",
    color: colors.textMuted,
    lineHeight: "1.5",
    margin: "16px 0 0 0",
  },
};

export default MagicLinkEmail;
