import { Text, Section } from "@react-email/components";
import * as React from "react";
import {
  BaseLayout,
  EmailButton,
  InfoBox,
  DetailsTable,
  DetailRow,
  Divider,
  PriceDisplay,
  colors,
} from "./base-layout";

interface QuoteEmailProps {
  customerName: string;
  quoteReference: string;
  tripDetails: {
    pickupLocation: string;
    dropoffLocation: string;
    departureDate: string;
    departureTime?: string;
    returnDate?: string;
    returnTime?: string;
    passengerCount: number;
    vehicleType?: string;
  };
  totalPrice: string;
  validUntil: string;
  acceptUrl: string;
  personalizedMessage?: string;
}

export function QuoteEmail({
  customerName,
  quoteReference,
  tripDetails,
  totalPrice,
  validUntil,
  acceptUrl,
  personalizedMessage,
}: QuoteEmailProps) {
  return (
    <BaseLayout preview={`Your quote ${quoteReference} is ready - ${totalPrice}`}>
      {/* Greeting */}
      <Text style={styles.greeting}>Dear {customerName},</Text>

      {/* Introduction */}
      <Text style={styles.paragraph}>
        Thank you for your enquiry! We&apos;re pleased to provide you with a quote for your upcoming coach hire.
      </Text>

      {personalizedMessage && (
        <Text style={styles.paragraph}>{personalizedMessage}</Text>
      )}

      {/* Quote Reference Badge */}
      <Section style={styles.refBadge}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.refBadgeInner}>
              <span style={styles.refLabel}>Quote Reference</span>
              <span style={styles.refValue}>{quoteReference}</span>
            </td>
          </tr>
        </table>
      </Section>

      {/* Price Display */}
      <PriceDisplay amount={totalPrice} label="Total Price" />

      <Divider />

      {/* Trip Details */}
      <DetailsTable title="&#128205; Trip Details">
        <DetailRow icon="&#128664;" label="Pick-up" value={tripDetails.pickupLocation} />
        <DetailRow icon="&#127937;" label="Drop-off" value={tripDetails.dropoffLocation} />
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
        {tripDetails.vehicleType && (
          <DetailRow icon="&#128652;" label="Vehicle" value={tripDetails.vehicleType} />
        )}
      </DetailsTable>

      {/* Validity Notice */}
      <InfoBox variant="warning" icon="&#9202;">
        <strong>Quote valid until {validUntil}</strong>
        <br />
        Please accept this quote before the expiry date to secure your booking at this price.
      </InfoBox>

      {/* CTA Button */}
      <EmailButton href={acceptUrl} variant="success">
        &#10003; Accept Quote &amp; Book Now
      </EmailButton>

      {/* What's included */}
      <Section style={styles.includedSection}>
        <Text style={styles.includedTitle}>&#10004; What&apos;s Included</Text>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.includedItem}>&#10003; Professional driver</td>
            <td style={styles.includedItem}>&#10003; Fuel costs</td>
          </tr>
          <tr>
            <td style={styles.includedItem}>&#10003; Insurance coverage</td>
            <td style={styles.includedItem}>&#10003; VAT included</td>
          </tr>
        </table>
      </Section>

      <Divider />

      {/* Closing */}
      <Text style={styles.paragraph}>
        If you have any questions about this quote, please don&apos;t hesitate to get in touch.
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
    backgroundColor: "#f0f9ff",
    border: "2px dashed #0ea5e9",
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
    color: colors.primary,
    fontFamily: "monospace",
  },
  includedSection: {
    margin: "24px 0",
  },
  includedTitle: {
    fontSize: "16px",
    fontWeight: "600" as const,
    color: colors.text,
    margin: "0 0 12px 0",
  },
  includedItem: {
    fontSize: "14px",
    color: colors.text,
    padding: "6px 0",
  },
  signature: {
    fontSize: "15px",
    color: colors.text,
    margin: "24px 0 0 0",
    lineHeight: "1.6",
  },
};

export default QuoteEmail;
