import { render } from "@react-email/components";
import { QuoteEmail } from "./templates/quote-email";
import { BookingConfirmationEmail } from "./templates/booking-confirmation-email";
import { EnquiryConfirmationEmail } from "./templates/enquiry-confirmation-email";
import { SupplierAssignmentEmail } from "./templates/supplier-assignment-email";
import { SupplierResponseEmail } from "./templates/supplier-response-email";
import { TripCompletionEmail } from "./templates/trip-completion-email";
import { BookingCancellationEmail } from "./templates/booking-cancellation-email";
import { MagicLinkEmail } from "./templates/magic-link-email";
import { SupplierInviteEmail } from "./templates/supplier-invite-email";

export type EmailTemplate =
  | { type: "quote"; props: Parameters<typeof QuoteEmail>[0] }
  | { type: "booking-confirmation"; props: Parameters<typeof BookingConfirmationEmail>[0] }
  | { type: "enquiry-confirmation"; props: Parameters<typeof EnquiryConfirmationEmail>[0] }
  | { type: "supplier-assignment"; props: Parameters<typeof SupplierAssignmentEmail>[0] }
  | { type: "supplier-response"; props: Parameters<typeof SupplierResponseEmail>[0] }
  | { type: "trip-completion"; props: Parameters<typeof TripCompletionEmail>[0] }
  | { type: "booking-cancellation"; props: Parameters<typeof BookingCancellationEmail>[0] }
  | { type: "magic-link"; props: Parameters<typeof MagicLinkEmail>[0] }
  | { type: "supplier-invite"; props: Parameters<typeof SupplierInviteEmail>[0] };

/**
 * Render an email template to HTML string
 */
export async function renderEmail(template: EmailTemplate): Promise<string> {
  switch (template.type) {
    case "quote":
      return render(QuoteEmail(template.props));
    case "booking-confirmation":
      return render(BookingConfirmationEmail(template.props));
    case "enquiry-confirmation":
      return render(EnquiryConfirmationEmail(template.props));
    case "supplier-assignment":
      return render(SupplierAssignmentEmail(template.props));
    case "supplier-response":
      return render(SupplierResponseEmail(template.props));
    case "trip-completion":
      return render(TripCompletionEmail(template.props));
    case "booking-cancellation":
      return render(BookingCancellationEmail(template.props));
    case "magic-link":
      return render(MagicLinkEmail(template.props));
    case "supplier-invite":
      return render(SupplierInviteEmail(template.props));
    default:
      throw new Error(`Unknown email template type`);
  }
}

/**
 * Render an email template and return both HTML and plain text
 */
export async function renderEmailWithText(template: EmailTemplate): Promise<{ html: string; text: string }> {
  switch (template.type) {
    case "quote":
      return {
        html: await render(QuoteEmail(template.props)),
        text: await render(QuoteEmail(template.props), { plainText: true }),
      };
    case "booking-confirmation":
      return {
        html: await render(BookingConfirmationEmail(template.props)),
        text: await render(BookingConfirmationEmail(template.props), { plainText: true }),
      };
    case "enquiry-confirmation":
      return {
        html: await render(EnquiryConfirmationEmail(template.props)),
        text: await render(EnquiryConfirmationEmail(template.props), { plainText: true }),
      };
    case "supplier-assignment":
      return {
        html: await render(SupplierAssignmentEmail(template.props)),
        text: await render(SupplierAssignmentEmail(template.props), { plainText: true }),
      };
    case "supplier-response":
      return {
        html: await render(SupplierResponseEmail(template.props)),
        text: await render(SupplierResponseEmail(template.props), { plainText: true }),
      };
    case "trip-completion":
      return {
        html: await render(TripCompletionEmail(template.props)),
        text: await render(TripCompletionEmail(template.props), { plainText: true }),
      };
    case "booking-cancellation":
      return {
        html: await render(BookingCancellationEmail(template.props)),
        text: await render(BookingCancellationEmail(template.props), { plainText: true }),
      };
    case "magic-link":
      return {
        html: await render(MagicLinkEmail(template.props)),
        text: await render(MagicLinkEmail(template.props), { plainText: true }),
      };
    case "supplier-invite":
      return {
        html: await render(SupplierInviteEmail(template.props)),
        text: await render(SupplierInviteEmail(template.props), { plainText: true }),
      };
    default:
      throw new Error(`Unknown email template type`);
  }
}

// Re-export templates for direct use
export { QuoteEmail } from "./templates/quote-email";
export { BookingConfirmationEmail } from "./templates/booking-confirmation-email";
export { EnquiryConfirmationEmail } from "./templates/enquiry-confirmation-email";
export { SupplierAssignmentEmail } from "./templates/supplier-assignment-email";
export { SupplierResponseEmail } from "./templates/supplier-response-email";
export { TripCompletionEmail } from "./templates/trip-completion-email";
export { BookingCancellationEmail } from "./templates/booking-cancellation-email";
export { MagicLinkEmail } from "./templates/magic-link-email";
export { SupplierInviteEmail } from "./templates/supplier-invite-email";

// Re-export base components for custom templates
export {
  BaseLayout,
  EmailButton,
  InfoBox,
  DetailsTable,
  DetailRow,
  Divider,
  StatusBadge,
  PriceDisplay,
  colors,
} from "./templates/base-layout";
