import { Text, Section } from "@react-email/components";
import * as React from "react";
import {
  BaseLayout,
  EmailButton,
  InfoBox,
  DetailsTable,
  DetailRow,
  Divider,
  StatusBadge,
  colors,
} from "./base-layout";

interface TripCompletionEmailProps {
  recipientName: string;
  recipientType: "customer" | "supplier";
  bookingReference: string;
  tripDetails: {
    pickupLocation: string;
    dropoffLocation: string;
    departureDate: string;
  };
  surveyUrl?: string;
}

export function TripCompletionEmail({
  recipientName,
  recipientType,
  bookingReference,
  tripDetails,
  surveyUrl,
}: TripCompletionEmailProps) {
  const isCustomer = recipientType === "customer";

  return (
    <BaseLayout preview={`Booking ${bookingReference} - Trip completed successfully!`}>
      {/* Completion Banner */}
      <Section style={styles.completionBanner}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.completionBannerInner}>
              <span style={styles.completionIcon}>🎉</span>
              <span style={styles.completionText}>
                {isCustomer ? "Trip Complete!" : "Job Completed"}
              </span>
            </td>
          </tr>
        </table>
      </Section>

      {/* Greeting */}
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      {/* Introduction */}
      {isCustomer ? (
        <Text style={styles.paragraph}>
          We hope you had a fantastic journey! Your booking <strong>{bookingReference}</strong> has
          been completed successfully.
        </Text>
      ) : (
        <Text style={styles.paragraph}>
          Booking <strong>{bookingReference}</strong> has been marked as completed.
          Thank you for your excellent service.
        </Text>
      )}

      {/* Booking Reference with Status */}
      <Section style={styles.refBadge}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.refBadgeInner}>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <tr>
                  <td style={{ textAlign: "center" as const }}>
                    <span style={styles.refLabel}>Booking Reference</span>
                    <span style={styles.refValue}>{bookingReference}</span>
                    <div style={{ marginTop: "8px" }}>
                      <StatusBadge status="completed" />
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Section>

      <Divider />

      {/* Trip Summary */}
      <DetailsTable title="&#128205; Trip Summary">
        <DetailRow icon="&#128664;" label="Pick-up" value={tripDetails.pickupLocation} />
        <DetailRow icon="&#127937;" label="Drop-off" value={tripDetails.dropoffLocation} />
        <DetailRow icon="&#128197;" label="Date" value={tripDetails.departureDate} />
      </DetailsTable>

      {/* Customer-specific content */}
      {isCustomer && (
        <>
          <InfoBox variant="info" icon="&#128172;">
            <strong>We&apos;d love your feedback!</strong>
            <br />
            Your experience matters to us. Please take a moment to share your thoughts
            and help us improve our service.
          </InfoBox>

          {surveyUrl && (
            <EmailButton href={surveyUrl} variant="primary">
              ⭐ Share Your Feedback
            </EmailButton>
          )}
        </>
      )}

      {/* Supplier-specific content */}
      {!isCustomer && (
        <InfoBox variant="success" icon="&#10003;">
          <strong>Thank you for your service!</strong>
          <br />
          We appreciate your professionalism and look forward to working with you again.
        </InfoBox>
      )}

      <Divider />

      {/* Closing */}
      <Text style={styles.paragraph}>
        {isCustomer
          ? "Thank you for choosing GroupBus. We hope to see you again soon!"
          : "Thank you for partnering with GroupBus."}
      </Text>

      <Text style={styles.signature}>
        Kind regards,
        <br />
        <strong>The GroupBus Team</strong>
      </Text>

      {/* Customer trust badges */}
      {isCustomer && (
        <Section style={styles.trustSection}>
          <table width="100%" cellPadding={0} cellSpacing={0}>
            <tr>
              <td style={styles.trustBadge}>
                <span style={styles.trustIcon}>★</span>
                <span style={styles.trustText}>Rated Excellent</span>
              </td>
              <td style={styles.trustBadge}>
                <span style={styles.trustIcon}>🔗</span>
                <span style={styles.trustText}>Refer a Friend</span>
              </td>
              <td style={styles.trustBadge}>
                <span style={styles.trustIcon}>🚌</span>
                <span style={styles.trustText}>Book Again</span>
              </td>
            </tr>
          </table>
        </Section>
      )}
    </BaseLayout>
  );
}

const styles = {
  completionBanner: {
    margin: "0 0 24px 0",
  },
  completionBannerInner: {
    backgroundColor: "#dbeafe",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center" as const,
  },
  completionIcon: {
    display: "inline-block",
    fontSize: "28px",
    marginRight: "12px",
    verticalAlign: "middle",
  },
  completionText: {
    fontSize: "20px",
    fontWeight: "700" as const,
    color: "#1e40af",
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
    backgroundColor: "#eff6ff",
    border: "2px solid #93c5fd",
    borderRadius: "12px",
    padding: "20px",
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
    color: "#1e40af",
    fontFamily: "monospace",
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

export default TripCompletionEmail;
