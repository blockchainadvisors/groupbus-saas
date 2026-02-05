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

interface BookingCancellationEmailProps {
  recipientName: string;
  recipientType: "customer" | "supplier";
  bookingReference: string;
  cancellationReason?: string;
  tripDetails: {
    pickupLocation: string;
    dropoffLocation: string;
    departureDate: string;
  };
  contactUrl?: string;
}

export function BookingCancellationEmail({
  recipientName,
  recipientType,
  bookingReference,
  cancellationReason,
  tripDetails,
  contactUrl,
}: BookingCancellationEmailProps) {
  const isCustomer = recipientType === "customer";

  return (
    <BaseLayout preview={`Booking ${bookingReference} has been cancelled`}>
      {/* Cancellation Banner */}
      <Section style={styles.cancellationBanner}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.cancellationBannerInner}>
              <span style={styles.cancellationIcon}>✗</span>
              <span style={styles.cancellationText}>Booking Cancelled</span>
            </td>
          </tr>
        </table>
      </Section>

      {/* Greeting */}
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      {/* Introduction */}
      {isCustomer ? (
        <Text style={styles.paragraph}>
          We regret to inform you that booking <strong>{bookingReference}</strong> has been
          cancelled. We apologise for any inconvenience this may cause.
        </Text>
      ) : (
        <Text style={styles.paragraph}>
          Booking <strong>{bookingReference}</strong> has been cancelled and no longer requires
          your service.
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
                      <StatusBadge status="cancelled" />
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Section>

      {/* Cancellation Reason */}
      {cancellationReason && (
        <InfoBox variant="neutral" icon="&#128172;">
          <strong>Reason for Cancellation:</strong>
          <br />
          {cancellationReason}
        </InfoBox>
      )}

      <Divider />

      {/* Trip Details */}
      <DetailsTable title="&#128205; Original Trip Details">
        <DetailRow icon="&#128664;" label="Pick-up" value={tripDetails.pickupLocation} />
        <DetailRow icon="&#127937;" label="Drop-off" value={tripDetails.dropoffLocation} />
        <DetailRow icon="&#128197;" label="Date" value={tripDetails.departureDate} />
      </DetailsTable>

      {/* Customer-specific content */}
      {isCustomer && (
        <>
          <InfoBox variant="info" icon="&#9432;">
            <strong>Need to Rebook?</strong>
            <br />
            If you&apos;d like to arrange alternative transport, please don&apos;t hesitate
            to contact us. We&apos;re here to help.
          </InfoBox>

          {contactUrl && (
            <EmailButton href={contactUrl}>
              Contact Us
            </EmailButton>
          )}
        </>
      )}

      <Divider />

      {/* Closing */}
      <Text style={styles.paragraph}>
        {isCustomer
          ? "If you have any questions or would like to rebook, please don't hesitate to contact us."
          : "Thank you for your understanding."}
      </Text>

      <Text style={styles.signature}>
        Kind regards,
        <br />
        <strong>The GroupBus Team</strong>
      </Text>
    </BaseLayout>
  );
}

const styles = {
  cancellationBanner: {
    margin: "0 0 24px 0",
  },
  cancellationBannerInner: {
    backgroundColor: "#fee2e2",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center" as const,
  },
  cancellationIcon: {
    display: "inline-block",
    width: "32px",
    height: "32px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    borderRadius: "50%",
    lineHeight: "32px",
    fontSize: "18px",
    marginRight: "12px",
    verticalAlign: "middle",
    textAlign: "center" as const,
  },
  cancellationText: {
    fontSize: "20px",
    fontWeight: "700" as const,
    color: "#991b1b",
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
    backgroundColor: "#fef2f2",
    border: "2px solid #fca5a5",
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
    color: "#991b1b",
    fontFamily: "monospace",
  },
  signature: {
    fontSize: "15px",
    color: colors.text,
    margin: "24px 0 0 0",
    lineHeight: "1.6",
  },
};

export default BookingCancellationEmail;
