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

interface BookingConfirmationEmailProps {
  recipientName: string;
  recipientType: "customer" | "supplier";
  bookingReference: string;
  tripDetails: {
    pickupLocation: string;
    dropoffLocation: string;
    departureDate: string;
    departureTime?: string;
    returnDate?: string;
    returnTime?: string;
    passengerCount: number;
  };
  customerDetails?: {
    name: string;
    email: string;
    phone?: string;
  };
  supplierDetails?: {
    companyName: string;
  };
  vehicleDetails?: {
    registration: string;
    type: string;
  };
  driverDetails?: {
    name: string;
    phone?: string;
  };
  totalAmount?: string;
  portalUrl?: string;
}

export function BookingConfirmationEmail({
  recipientName,
  recipientType,
  bookingReference,
  tripDetails,
  customerDetails,
  supplierDetails,
  vehicleDetails,
  driverDetails,
  totalAmount,
  portalUrl,
}: BookingConfirmationEmailProps) {
  const isCustomer = recipientType === "customer";

  return (
    <BaseLayout preview={`Booking ${bookingReference} confirmed - Your coach hire is secured!`}>
      {/* Success Banner */}
      <Section style={styles.successBanner}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td style={styles.successBannerInner}>
              <span style={styles.successIcon}>&#10003;</span>
              <span style={styles.successText}>Booking Confirmed!</span>
            </td>
          </tr>
        </table>
      </Section>

      {/* Greeting */}
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      {/* Introduction - different for customer vs supplier */}
      {isCustomer ? (
        <Text style={styles.paragraph}>
          Great news! Your coach hire booking has been confirmed. We&apos;re excited to be part of your journey.
          Below you&apos;ll find all the details you need.
        </Text>
      ) : (
        <Text style={styles.paragraph}>
          A new booking has been confirmed and assigned to your company. Please review the details below and
          ensure you&apos;re ready to provide excellent service.
        </Text>
      )}

      {/* Booking Reference */}
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
                      <StatusBadge status="confirmed" />
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Section>

      <Divider />

      {/* Trip Details */}
      <DetailsTable title="&#128205; Journey Details">
        <DetailRow icon="&#128664;" label="Pick-up Location" value={tripDetails.pickupLocation} />
        <DetailRow icon="&#127937;" label="Drop-off Location" value={tripDetails.dropoffLocation} />
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
      </DetailsTable>

      {/* Vehicle & Driver (if assigned) */}
      {(vehicleDetails || driverDetails) && (
        <DetailsTable title="&#128652; Vehicle & Driver">
          {vehicleDetails && (
            <>
              <DetailRow icon="&#128663;" label="Vehicle Type" value={vehicleDetails.type} />
              <DetailRow icon="&#128178;" label="Registration" value={vehicleDetails.registration} />
            </>
          )}
          {driverDetails && (
            <>
              <DetailRow icon="&#128100;" label="Driver" value={driverDetails.name} />
              {driverDetails.phone && (
                <DetailRow icon="&#128222;" label="Driver Phone" value={driverDetails.phone} />
              )}
            </>
          )}
        </DetailsTable>
      )}

      {/* Customer details (for supplier emails) */}
      {!isCustomer && customerDetails && (
        <DetailsTable title="&#128100; Customer Details">
          <DetailRow icon="&#128100;" label="Name" value={customerDetails.name} />
          <DetailRow icon="&#128231;" label="Email" value={customerDetails.email} />
          {customerDetails.phone && (
            <DetailRow icon="&#128222;" label="Phone" value={customerDetails.phone} />
          )}
        </DetailsTable>
      )}

      {/* Supplier details (for customer emails) */}
      {isCustomer && supplierDetails && (
        <InfoBox variant="info" icon="&#128652;">
          <strong>Your Coach Provider:</strong> {supplierDetails.companyName}
          <br />
          They&apos;ll be taking care of you on your journey.
        </InfoBox>
      )}

      {/* Payment info for customers */}
      {isCustomer && totalAmount && (
        <Section style={styles.paymentSection}>
          <table width="100%" cellPadding={0} cellSpacing={0}>
            <tr>
              <td style={styles.paymentBox}>
                <span style={styles.paymentLabel}>Total Paid</span>
                <span style={styles.paymentAmount}>{totalAmount}</span>
                <span style={styles.paymentStatus}>&#10003; Payment Complete</span>
              </td>
            </tr>
          </table>
        </Section>
      )}

      {/* Important reminders */}
      <Section style={styles.remindersSection}>
        <Text style={styles.remindersTitle}>&#128221; Important Reminders</Text>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          {isCustomer ? (
            <>
              <tr>
                <td style={styles.reminderItem}>
                  <span style={styles.reminderIcon}>&#128337;</span>
                  Please be at the pick-up location 10 minutes early
                </td>
              </tr>
              <tr>
                <td style={styles.reminderItem}>
                  <span style={styles.reminderIcon}>&#128222;</span>
                  Have the driver&apos;s contact number saved
                </td>
              </tr>
              <tr>
                <td style={styles.reminderItem}>
                  <span style={styles.reminderIcon}>&#128179;</span>
                  Keep your booking reference handy
                </td>
              </tr>
            </>
          ) : (
            <>
              <tr>
                <td style={styles.reminderItem}>
                  <span style={styles.reminderIcon}>&#128337;</span>
                  Arrive at pick-up 15 minutes before departure
                </td>
              </tr>
              <tr>
                <td style={styles.reminderItem}>
                  <span style={styles.reminderIcon}>&#128221;</span>
                  Verify passenger count matches the booking
                </td>
              </tr>
              <tr>
                <td style={styles.reminderItem}>
                  <span style={styles.reminderIcon}>&#128222;</span>
                  Contact customer if any issues arise
                </td>
              </tr>
            </>
          )}
        </table>
      </Section>

      {/* CTA */}
      {portalUrl && (
        <EmailButton href={portalUrl}>
          {isCustomer ? "View Booking Details" : "View in Supplier Portal"}
        </EmailButton>
      )}

      <Divider />

      {/* Closing */}
      <Text style={styles.paragraph}>
        {isCustomer
          ? "We hope you have a fantastic journey! If you have any questions, we're here to help."
          : "Thank you for partnering with GroupBus. Please ensure excellent service for our customer."}
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
  successBanner: {
    margin: "0 0 24px 0",
  },
  successBannerInner: {
    backgroundColor: "#dcfce7",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center" as const,
  },
  successIcon: {
    display: "inline-block",
    width: "32px",
    height: "32px",
    backgroundColor: "#10b981",
    color: "#ffffff",
    borderRadius: "50%",
    lineHeight: "32px",
    fontSize: "18px",
    marginRight: "12px",
    verticalAlign: "middle",
  },
  successText: {
    fontSize: "20px",
    fontWeight: "700" as const,
    color: "#166534",
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
    backgroundColor: "#f0fdf4",
    border: "2px solid #86efac",
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
    color: "#166534",
    fontFamily: "monospace",
  },
  paymentSection: {
    margin: "24px 0",
  },
  paymentBox: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "8px",
    padding: "20px",
    textAlign: "center" as const,
  },
  paymentLabel: {
    display: "block",
    fontSize: "12px",
    color: colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  paymentAmount: {
    display: "block",
    fontSize: "28px",
    fontWeight: "700" as const,
    color: colors.primary,
    margin: "8px 0",
  },
  paymentStatus: {
    display: "inline-block",
    fontSize: "13px",
    color: "#166534",
    backgroundColor: "#dcfce7",
    padding: "4px 12px",
    borderRadius: "4px",
  },
  remindersSection: {
    margin: "24px 0",
    backgroundColor: colors.background,
    borderRadius: "8px",
    padding: "20px",
  },
  remindersTitle: {
    fontSize: "16px",
    fontWeight: "600" as const,
    color: colors.text,
    margin: "0 0 16px 0",
  },
  reminderItem: {
    fontSize: "14px",
    color: colors.text,
    padding: "8px 0",
    borderBottom: `1px solid ${colors.border}`,
  },
  reminderIcon: {
    marginRight: "12px",
  },
  signature: {
    fontSize: "15px",
    color: colors.text,
    margin: "24px 0 0 0",
    lineHeight: "1.6",
  },
};

export default BookingConfirmationEmail;
