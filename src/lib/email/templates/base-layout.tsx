import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";
import * as React from "react";

// Brand colors
const colors = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  secondary: "#64748b",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  background: "#f8fafc",
  surface: "#ffffff",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
};

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header with logo */}
          <Section style={styles.header}>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={styles.logoCell}>
                  {/* Text-based logo with icon - no images needed */}
                  <span style={styles.logoIcon}>&#128652;</span>
                  <span style={styles.logoText}>GroupBus</span>
                </td>
              </tr>
            </table>
          </Section>

          {/* Main content */}
          <Section style={styles.content}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Hr style={styles.footerDivider} />
            <Text style={styles.footerText}>
              GroupBus Ltd | Your trusted coach hire partner
            </Text>
            <Text style={styles.footerLinks}>
              <Link href="https://groupbus.co.uk" style={styles.footerLink}>Website</Link>
              {" | "}
              <Link href="mailto:support@groupbus.co.uk" style={styles.footerLink}>Support</Link>
              {" | "}
              <Link href="https://groupbus.co.uk/privacy" style={styles.footerLink}>Privacy</Link>
            </Text>
            <Text style={styles.copyright}>
              &copy; {new Date().getFullYear()} GroupBus Ltd. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Reusable styled components

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "success" | "warning";
}

export function EmailButton({ href, children, variant = "primary" }: ButtonProps) {
  const bgColor = variant === "success" ? colors.success : variant === "warning" ? colors.warning : colors.primary;

  return (
    <table width="100%" cellPadding={0} cellSpacing={0}>
      <tr>
        <td align="center" style={{ padding: "20px 0" }}>
          <table cellPadding={0} cellSpacing={0}>
            <tr>
              <td
                style={{
                  backgroundColor: bgColor,
                  borderRadius: "8px",
                  padding: "14px 32px",
                }}
              >
                <Link
                  href={href}
                  style={{
                    color: "#ffffff",
                    fontSize: "16px",
                    fontWeight: "600",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  {children}
                </Link>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  );
}

interface InfoBoxProps {
  children: React.ReactNode;
  variant?: "info" | "success" | "warning" | "neutral";
  icon?: string;
}

export function InfoBox({ children, variant = "neutral", icon }: InfoBoxProps) {
  const variantStyles = {
    info: { bg: "#eff6ff", border: "#bfdbfe", icon: "&#9432;" },
    success: { bg: "#ecfdf5", border: "#a7f3d0", icon: "&#10003;" },
    warning: { bg: "#fffbeb", border: "#fde68a", icon: "&#9888;" },
    neutral: { bg: "#f8fafc", border: "#e2e8f0", icon: "&#8226;" },
  };

  const style = variantStyles[variant];

  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={{ margin: "16px 0" }}>
      <tr>
        <td
          style={{
            backgroundColor: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <table width="100%" cellPadding={0} cellSpacing={0}>
            <tr>
              <td width="30" valign="top" style={{ fontSize: "20px" }}>
                <span dangerouslySetInnerHTML={{ __html: icon || style.icon }} />
              </td>
              <td style={{ fontSize: "14px", color: colors.text, lineHeight: "1.5" }}>
                {children}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  );
}

interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: string;
}

export function DetailRow({ label, value, icon }: DetailRowProps) {
  return (
    <tr>
      <td style={styles.detailLabel}>
        {icon && <span style={{ marginRight: "8px" }} dangerouslySetInnerHTML={{ __html: icon }} />}
        {label}
      </td>
      <td style={styles.detailValue}>{value}</td>
    </tr>
  );
}

interface DetailsTableProps {
  children: React.ReactNode;
  title?: string;
}

export function DetailsTable({ children, title }: DetailsTableProps) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={styles.detailsTable}>
      {title && (
        <tr>
          <td colSpan={2} style={styles.detailsTitle}>{title}</td>
        </tr>
      )}
      {children}
    </table>
  );
}

export function Divider() {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0}>
      <tr>
        <td style={{ padding: "20px 0" }}>
          <table width="100%" cellPadding={0} cellSpacing={0}>
            <tr>
              <td style={{ width: "40%", borderBottom: `2px solid ${colors.border}` }} />
              <td style={{ width: "20%", textAlign: "center" as const }}>
                <span style={{ color: colors.textMuted, fontSize: "14px" }}>&#9670;</span>
              </td>
              <td style={{ width: "40%", borderBottom: `2px solid ${colors.border}` }} />
            </tr>
          </table>
        </td>
      </tr>
    </table>
  );
}

interface StatusBadgeProps {
  status: "confirmed" | "pending" | "cancelled" | "completed";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    confirmed: { bg: "#dcfce7", color: "#166534", text: "Confirmed", icon: "&#10003;" },
    pending: { bg: "#fef3c7", color: "#92400e", text: "Pending", icon: "&#9202;" },
    cancelled: { bg: "#fee2e2", color: "#991b1b", text: "Cancelled", icon: "&#10005;" },
    completed: { bg: "#dbeafe", color: "#1e40af", text: "Completed", icon: "&#9733;" },
  };

  const c = config[status];

  return (
    <span
      style={{
        backgroundColor: c.bg,
        color: c.color,
        padding: "4px 12px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: "600",
        display: "inline-block",
      }}
    >
      <span dangerouslySetInnerHTML={{ __html: c.icon }} /> {c.text}
    </span>
  );
}

export function PriceDisplay({ amount, label }: { amount: string; label?: string }) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={{ margin: "20px 0" }}>
      <tr>
        <td
          style={{
            backgroundColor: colors.primary,
            borderRadius: "12px",
            padding: "24px",
            textAlign: "center" as const,
          }}
        >
          {label && (
            <Text style={{ color: "#ffffff", opacity: 0.8, fontSize: "14px", margin: "0 0 8px 0" }}>
              {label}
            </Text>
          )}
          <Text style={{ color: "#ffffff", fontSize: "36px", fontWeight: "700", margin: 0 }}>
            {amount}
          </Text>
        </td>
      </tr>
    </table>
  );
}

// Styles
const styles = {
  body: {
    backgroundColor: colors.background,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "20px",
  },
  header: {
    backgroundColor: colors.surface,
    borderRadius: "12px 12px 0 0",
    borderBottom: `3px solid ${colors.primary}`,
    padding: "24px 32px",
  },
  logoCell: {
    textAlign: "center" as const,
  },
  logoIcon: {
    fontSize: "32px",
    marginRight: "8px",
    verticalAlign: "middle",
  },
  logoText: {
    fontSize: "28px",
    fontWeight: "700" as const,
    color: colors.primary,
    verticalAlign: "middle",
  },
  content: {
    backgroundColor: colors.surface,
    padding: "32px",
  },
  footer: {
    backgroundColor: colors.surface,
    borderRadius: "0 0 12px 12px",
    padding: "24px 32px",
    textAlign: "center" as const,
  },
  footerDivider: {
    borderTop: `1px solid ${colors.border}`,
    margin: "0 0 20px 0",
  },
  footerText: {
    color: colors.textMuted,
    fontSize: "14px",
    margin: "0 0 8px 0",
  },
  footerLinks: {
    fontSize: "13px",
    margin: "0 0 12px 0",
  },
  footerLink: {
    color: colors.primary,
    textDecoration: "none",
  },
  copyright: {
    color: colors.textMuted,
    fontSize: "12px",
    margin: 0,
  },
  detailsTable: {
    backgroundColor: colors.background,
    borderRadius: "8px",
    margin: "16px 0",
    overflow: "hidden" as const,
  },
  detailsTitle: {
    backgroundColor: colors.primary,
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600" as const,
    padding: "12px 16px",
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: "13px",
    padding: "12px 16px",
    borderBottom: `1px solid ${colors.border}`,
    width: "40%",
  },
  detailValue: {
    color: colors.text,
    fontSize: "14px",
    fontWeight: "500" as const,
    padding: "12px 16px",
    borderBottom: `1px solid ${colors.border}`,
  },
};

export { colors };
