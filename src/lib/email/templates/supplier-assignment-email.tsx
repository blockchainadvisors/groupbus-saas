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

interface SupplierAssignmentEmailProps {
  supplierName: string;
  bookingReference: string;
  vehicleRegistration: string;
  tripDetails: {
    pickupLocation: string;
    dropoffLocation: string;
    departureDate: string;
    departureTime?: string;
    passengerCount?: number;
  };
  responseUrl?: string;
}

export function SupplierAssignmentEmail({
  supplierName,
  bookingReference,
  vehicleRegistration,
  tripDetails,
  responseUrl,
}: SupplierAssignmentEmailProps) {
  return (
    <BaseLayout preview={`Booking ${bookingReference} - Vehicle assigned, please respond`}>
      {/* Assignment Banner */}
      <Section style={styles.assignmentBanner}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.assignmentBannerInner}>
              <span style={styles.assignmentIcon}>🚌</span>
              <span style={styles.assignmentText}>Vehicle Assigned</span>
            </td>
          </tr>
        </table>
      </Section>

      {/* Greeting */}
      <Text style={styles.greeting}>Dear {supplierName},</Text>

      {/* Introduction */}
      <Text style={styles.paragraph}>
        A vehicle has been assigned to booking <strong>{bookingReference}</strong>.
        Please review the details below and confirm your availability.
      </Text>

      {/* Booking Reference Badge */}
      <Section style={styles.refBadge}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.refBadgeInner}>
              <span style={styles.refLabel}>Booking Reference</span>
              <span style={styles.refValue}>{bookingReference}</span>
            </td>
          </tr>
        </table>
      </Section>

      <Divider />

      {/* Assignment Details */}
      <DetailsTable title="&#128663; Assignment Details">
        <DetailRow icon="&#128653;" label="Vehicle" value={vehicleRegistration} />
      </DetailsTable>

      {/* Trip Details */}
      <DetailsTable title="&#128205; Trip Details">
        <DetailRow icon="&#128664;" label="Pick-up" value={tripDetails.pickupLocation} />
        <DetailRow icon="&#127937;" label="Drop-off" value={tripDetails.dropoffLocation} />
        <DetailRow
          icon="&#128197;"
          label="Departure"
          value={`${tripDetails.departureDate}${tripDetails.departureTime ? ` at ${tripDetails.departureTime}` : ""}`}
        />
        {tripDetails.passengerCount && (
          <DetailRow icon="&#128101;" label="Passengers" value={`${tripDetails.passengerCount} people`} />
        )}
      </DetailsTable>

      {/* Action Required */}
      <InfoBox variant="warning" icon="&#9888;">
        <strong>Action Required</strong>
        <br />
        Please click the button below to accept or reject this assignment. When accepting, you will need to provide the driver&apos;s name and contact details.
      </InfoBox>

      {/* CTA */}
      {responseUrl && (
        <EmailButton href={responseUrl}>
          Respond to Assignment
        </EmailButton>
      )}

      <Divider />

      {/* Closing */}
      <Text style={styles.paragraph}>
        If you have any questions or need to discuss this assignment, please contact us.
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
  assignmentBanner: {
    margin: "0 0 24px 0",
  },
  assignmentBannerInner: {
    backgroundColor: "#fef3c7",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center" as const,
  },
  assignmentIcon: {
    display: "inline-block",
    fontSize: "28px",
    marginRight: "12px",
    verticalAlign: "middle",
  },
  assignmentText: {
    fontSize: "20px",
    fontWeight: "700" as const,
    color: "#92400e",
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
    margin: "20px 0",
  },
  refBadgeInner: {
    backgroundColor: "#fffbeb",
    border: "2px dashed #f59e0b",
    borderRadius: "8px",
    padding: "16px",
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
    fontSize: "24px",
    fontWeight: "700" as const,
    color: "#92400e",
    fontFamily: "monospace",
  },
  signature: {
    fontSize: "15px",
    color: colors.text,
    margin: "24px 0 0 0",
    lineHeight: "1.6",
  },
};

export default SupplierAssignmentEmail;
