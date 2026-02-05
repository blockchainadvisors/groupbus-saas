import { render } from "@react-email/components";
import { QuoteEmail } from "./templates/quote-email";
import { BookingConfirmationEmail } from "./templates/booking-confirmation-email";
import { EnquiryConfirmationEmail } from "./templates/enquiry-confirmation-email";

export type EmailTemplate =
  | { type: "quote"; props: Parameters<typeof QuoteEmail>[0] }
  | { type: "booking-confirmation"; props: Parameters<typeof BookingConfirmationEmail>[0] }
  | { type: "enquiry-confirmation"; props: Parameters<typeof EnquiryConfirmationEmail>[0] };

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
    default:
      throw new Error(`Unknown email template type`);
  }
}

// Re-export templates for direct use
export { QuoteEmail } from "./templates/quote-email";
export { BookingConfirmationEmail } from "./templates/booking-confirmation-email";
export { EnquiryConfirmationEmail } from "./templates/enquiry-confirmation-email";

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
