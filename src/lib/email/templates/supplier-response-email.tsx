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

interface SupplierResponseEmailProps {
  supplierName: string;
  bookingReference: string;
  action: "accepted" | "rejected";
  reason?: string;
  driverName?: string;
  driverPhone?: string;
  tripDetails: {
    pickupLocation: string;
    dropoffLocation: string;
    departureDate: string;
  };
  bookingUrl?: string;
}

export function SupplierResponseEmail({
  supplierName,
  bookingReference,
  action,
  reason,
  driverName,
  driverPhone,
  tripDetails,
  bookingUrl,
}: SupplierResponseEmailProps) {
  const isAccepted = action === "accepted";

  return (
    <BaseLayout preview={`Booking ${bookingReference} - Supplier ${action}`}>
      {/* Response Banner */}
      <Section style={isAccepted ? styles.acceptedBanner : styles.rejectedBanner}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={isAccepted ? styles.acceptedBannerInner : styles.rejectedBannerInner}>
              <span style={styles.bannerIcon}>{isAccepted ? "✓" : "✗"}</span>
              <span style={isAccepted ? styles.acceptedText : styles.rejectedText}>
                Supplier {isAccepted ? "Accepted" : "Rejected"}
              </span>
            </td>
          </tr>
        </table>
      </Section>

      {/* Introduction */}
      <Text style={styles.paragraph}>
        <strong>{supplierName}</strong> has <strong>{action}</strong> booking{" "}
        <strong>{bookingReference}</strong>.
      </Text>

      {/* Booking Reference with Status */}
      <Section style={styles.refBadge}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={isAccepted ? styles.refBadgeAccepted : styles.refBadgeRejected}>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <tr>
                  <td style={{ textAlign: "center" as const }}>
                    <span style={styles.refLabel}>Booking Reference</span>
                    <span style={isAccepted ? styles.refValueAccepted : styles.refValueRejected}>
                      {bookingReference}
                    </span>
                    <div style={{ marginTop: "8px" }}>
                      <StatusBadge status={isAccepted ? "confirmed" : "cancelled"} />
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Section>

      {/* Rejection Reason */}
      {!isAccepted && reason && (
        <InfoBox variant="warning" icon="&#128172;">
          <strong>Reason for Rejection:</strong>
          <br />
          {reason}
        </InfoBox>
      )}

      <Divider />

      {/* Driver Details (when accepted) */}
      {isAccepted && driverName && (
        <DetailsTable title="&#128100; Driver Details">
          <DetailRow icon="&#128100;" label="Driver Name" value={driverName} />
          {driverPhone && (
            <DetailRow icon="&#128222;" label="Driver Phone" value={driverPhone} />
          )}
        </DetailsTable>
      )}

      {/* Trip Details */}
      <DetailsTable title="&#128205; Trip Details">
        <DetailRow icon="&#128664;" label="Pick-up" value={tripDetails.pickupLocation} />
        <DetailRow icon="&#127937;" label="Drop-off" value={tripDetails.dropoffLocation} />
        <DetailRow icon="&#128197;" label="Date" value={tripDetails.departureDate} />
      </DetailsTable>

      {/* Action Notice */}
      {!isAccepted && (
        <InfoBox variant="info" icon="&#9432;">
          <strong>Action Required</strong>
          <br />
          Please reassign this booking to another supplier.
        </InfoBox>
      )}

      {isAccepted && (
        <InfoBox variant="success" icon="&#10003;">
          <strong>Booking Confirmed</strong>
          <br />
          The supplier has confirmed their availability. The booking is now ready to proceed.
        </InfoBox>
      )}

      {/* CTA */}
      {bookingUrl && (
        <EmailButton href={bookingUrl}>
          View Booking Details
        </EmailButton>
      )}

      <Divider />

      {/* Closing */}
      <Text style={styles.signature}>
        Kind regards,
        <br />
        <strong>The GroupBus Team</strong>
      </Text>
    </BaseLayout>
  );
}

const styles = {
  acceptedBanner: {
    margin: "0 0 24px 0",
  },
  acceptedBannerInner: {
    backgroundColor: "#dcfce7",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center" as const,
  },
  rejectedBanner: {
    margin: "0 0 24px 0",
  },
  rejectedBannerInner: {
    backgroundColor: "#fee2e2",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center" as const,
  },
  bannerIcon: {
    display: "inline-block",
    width: "32px",
    height: "32px",
    lineHeight: "32px",
    fontSize: "18px",
    marginRight: "12px",
    verticalAlign: "middle",
  },
  acceptedText: {
    fontSize: "20px",
    fontWeight: "700" as const,
    color: "#166534",
    verticalAlign: "middle",
  },
  rejectedText: {
    fontSize: "20px",
    fontWeight: "700" as const,
    color: "#991b1b",
    verticalAlign: "middle",
  },
  paragraph: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: colors.text,
    margin: "0 0 16px 0",
  },
  refBadge: {
    margin: "20px 0",
  },
  refBadgeAccepted: {
    backgroundColor: "#f0fdf4",
    border: "2px solid #86efac",
    borderRadius: "12px",
    padding: "20px",
  },
  refBadgeRejected: {
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
  refValueAccepted: {
    display: "block",
    fontSize: "24px",
    fontWeight: "700" as const,
    color: "#166534",
    fontFamily: "monospace",
  },
  refValueRejected: {
    display: "block",
    fontSize: "24px",
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

export default SupplierResponseEmail;
