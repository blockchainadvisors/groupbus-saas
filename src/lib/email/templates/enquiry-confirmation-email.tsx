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

interface EnquiryConfirmationEmailProps {
  customerName: string;
  enquiryReference: string;
  tripDetails: {
    pickupLocation: string;
    dropoffLocation: string;
    departureDate: string;
    departureTime?: string;
    returnDate?: string;
    returnTime?: string;
    passengerCount: number;
    tripType: string;
    specialRequirements?: string;
  };
  dashboardUrl?: string; // Magic link URL for guest users to access dashboard
}

export function EnquiryConfirmationEmail({
  customerName,
  enquiryReference,
  tripDetails,
  dashboardUrl,
}: EnquiryConfirmationEmailProps) {
  return (
    <BaseLayout preview={`Enquiry ${enquiryReference} received - We're finding the best quotes for you!`}>
      {/* Received Banner */}
      <Section style={styles.receivedBanner}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.receivedBannerInner}>
              <span style={styles.receivedIcon}>💬</span>
              <span style={styles.receivedText}>Enquiry Received!</span>
            </td>
          </tr>
        </table>
      </Section>

      {/* Greeting */}
      <Text style={styles.greeting}>Dear {customerName},</Text>

      {/* Introduction */}
      <Text style={styles.paragraph}>
        Thank you for choosing GroupBus for your coach hire needs. We&apos;ve received your enquiry and our team
        is already working on finding the best quotes from our trusted suppliers.
      </Text>

      {/* Enquiry Reference */}
      <Section style={styles.refBadge}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.refBadgeInner}>
              <span style={styles.refLabel}>Your Enquiry Reference</span>
              <span style={styles.refValue}>{enquiryReference}</span>
              <span style={styles.refNote}>Please quote this reference in all communications</span>
            </td>
          </tr>
        </table>
      </Section>

      <Divider />

      {/* Trip Summary */}
      <DetailsTable title="&#128205; Your Trip Details">
        <DetailRow icon="&#128664;" label="Pick-up" value={tripDetails.pickupLocation} />
        <DetailRow icon="&#127937;" label="Drop-off" value={tripDetails.dropoffLocation} />
        <DetailRow icon="&#128652;" label="Trip Type" value={tripDetails.tripType} />
        <DetailRow
          icon="&#128197;"
          label="Departure"
          value={`${tripDetails.departureDate}${tripDetails.departureTime ? ` at ${tripDetails.departureTime}` : ""}`}
        />
        {tripDetails.returnDate && (
          <DetailRow
            icon="&#128260;"
            label="Return"
            value={`${tripDetails.returnDate}${tripDetails.returnTime ? ` at ${tripDetails.returnTime}` : ""}`}
          />
        )}
        <DetailRow icon="&#128101;" label="Passengers" value={`${tripDetails.passengerCount} people`} />
        {tripDetails.specialRequirements && (
          <DetailRow icon="&#128221;" label="Special Requirements" value={tripDetails.specialRequirements} />
        )}
      </DetailsTable>

      {/* What happens next */}
      <Section style={styles.nextStepsSection}>
        <Text style={styles.nextStepsTitle}>&#128640; What Happens Next?</Text>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.stepNumber}>1</td>
            <td style={styles.stepContent}>
              <strong>Supplier Matching</strong>
              <br />
              <span style={styles.stepDesc}>We&apos;re contacting our network of trusted coach operators</span>
            </td>
          </tr>
          <tr>
            <td style={styles.stepNumber}>2</td>
            <td style={styles.stepContent}>
              <strong>Quote Collection</strong>
              <br />
              <span style={styles.stepDesc}>We&apos;ll gather competitive quotes tailored to your needs</span>
            </td>
          </tr>
          <tr>
            <td style={styles.stepNumber}>3</td>
            <td style={styles.stepContent}>
              <strong>Your Personalized Quote</strong>
              <br />
              <span style={styles.stepDesc}>You&apos;ll receive the best offer within 24-48 hours</span>
            </td>
          </tr>
        </table>
      </Section>

      {/* Urgency notice */}
      <InfoBox variant="info" icon="&#9202;">
        <strong>Need it faster?</strong>
        <br />
        If your trip is within 48 hours, please call us directly at <strong>0800 123 4567</strong> for immediate assistance.
      </InfoBox>

      {/* Dashboard Access - for guest users with magic link */}
      {dashboardUrl && (
        <>
          <InfoBox variant="success" icon="&#128273;">
            <strong>Access Your Dashboard</strong>
            <br />
            View your enquiry status, receive quotes, and manage your bookings - all in one place.
            This secure link is valid for 24 hours.
          </InfoBox>
          <EmailButton href={dashboardUrl} variant="success">
            Access Your Dashboard
          </EmailButton>
          <Divider />
        </>
      )}

      {/* CTA - fallback for logged-in users */}
      {!dashboardUrl && (
        <EmailButton href="https://groupbus.co.uk/dashboard">
          View Your Dashboard
        </EmailButton>
      )}

      <Divider />

      {/* Closing */}
      <Text style={styles.paragraph}>
        Have questions or need to make changes? Simply reply to this email or call us - we&apos;re here to help!
      </Text>

      <Text style={styles.signature}>
        Kind regards,
        <br />
        <strong>The GroupBus Team</strong>
      </Text>

      {/* Trust badges */}
      <Section style={styles.trustSection}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.trustBadge}>
              <span style={styles.trustIcon}>★</span>
              <span style={styles.trustText}>4.9/5 Rating</span>
            </td>
            <td style={styles.trustBadge}>
              <span style={styles.trustIcon}>🔒</span>
              <span style={styles.trustText}>Secure Payments</span>
            </td>
            <td style={styles.trustBadge}>
              <span style={styles.trustIcon}>🚌</span>
              <span style={styles.trustText}>500+ Coaches</span>
            </td>
          </tr>
        </table>
      </Section>
    </BaseLayout>
  );
}

const styles = {
  receivedBanner: {
    margin: "0 0 24px 0",
  },
  receivedBannerInner: {
    backgroundColor: "#eff6ff",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center" as const,
  },
  receivedIcon: {
    display: "inline-block",
    fontSize: "28px",
    marginRight: "12px",
    verticalAlign: "middle",
  },
  receivedText: {
    fontSize: "20px",
    fontWeight: "700" as const,
    color: colors.primary,
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
  refBadge: {
    margin: "24px 0",
  },
  refBadgeInner: {
    backgroundColor: "#faf5ff",
    border: "2px dashed #c084fc",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center" as const,
  },
  refLabel: {
    display: "block",
    fontSize: "12px",
    color: colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    marginBottom: "4px",
  },
  refValue: {
    display: "block",
    fontSize: "28px",
    fontWeight: "700" as const,
    color: "#7c3aed",
    fontFamily: "monospace",
  },
  refNote: {
    display: "block",
    fontSize: "12px",
    color: colors.textMuted,
    marginTop: "8px",
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
  signature: {
    fontSize: "15px",
    color: colors.text,
    margin: "24px 0 0 0",
    lineHeight: "1.6",
  },
  trustSection: {
    marginTop: "32px",
    borderTop: `1px solid ${colors.border}`,
    paddingTop: "20px",
  },
  trustBadge: {
    textAlign: "center" as const,
    padding: "8px",
  },
  trustIcon: {
    display: "block",
    fontSize: "24px",
    marginBottom: "4px",
  },
  trustText: {
    fontSize: "11px",
    color: colors.textMuted,
  },
};

export default EnquiryConfirmationEmail;
