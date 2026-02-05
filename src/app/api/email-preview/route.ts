import { NextRequest, NextResponse } from "next/server";
import { renderEmail } from "@/lib/email/render";
import { MagicLinkPurpose } from "@prisma/client";

// Sample data for preview
const SAMPLE_DATA = {
  quote: {
    customerName: "John Smith",
    quoteReference: "QT-2024-00123",
    tripDetails: {
      pickupLocation: "London Victoria Station",
      dropoffLocation: "Manchester Piccadilly",
      departureDate: "15 March 2024",
      departureTime: "09:00",
      returnDate: "17 March 2024",
      returnTime: "18:00",
      passengerCount: 45,
      vehicleType: "Executive Coach (49 seats)",
    },
    totalPrice: "£1,450.00",
    validUntil: "10 March 2024",
    acceptUrl: "https://groupbus.co.uk/quote/accept/abc123",
    personalizedMessage:
      "Based on your requirements, we've selected a premium executive coach perfect for your corporate away day.",
  },
  "booking-confirmation": {
    recipientName: "John Smith",
    recipientType: "customer" as const,
    bookingReference: "GB-BK-2024-00456",
    tripDetails: {
      pickupLocation: "London Victoria Station",
      dropoffLocation: "Manchester Piccadilly",
      departureDate: "15 March 2024",
      departureTime: "09:00",
      returnDate: "17 March 2024",
      returnTime: "18:00",
      passengerCount: 45,
    },
    supplierDetails: {
      companyName: "Premier Coaches Ltd",
    },
    vehicleDetails: {
      registration: "ABC 123 XY",
      type: "Executive Coach (49 seats)",
    },
    driverDetails: {
      name: "David Wilson",
      phone: "07700 900123",
    },
    totalAmount: "£1,450.00",
    portalUrl: "https://groupbus.co.uk/booking/GB-BK-2024-00456",
  },
  "enquiry-confirmation": {
    customerName: "Sarah Johnson",
    enquiryReference: "GB-ENQ-2024-00789",
    tripDetails: {
      pickupLocation: "Birmingham New Street Station",
      dropoffLocation: "Edinburgh Waverley Station",
      departureDate: "22 April 2024",
      departureTime: "07:30",
      returnDate: "24 April 2024",
      returnTime: "19:00",
      passengerCount: 32,
      tripType: "Return Journey",
      specialRequirements: "Wheelchair accessible vehicle required. 2 passengers use wheelchairs.",
    },
  },
  "supplier-assignment": {
    supplierName: "Premier Coaches Ltd",
    bookingReference: "GB-BK-2024-00456",
    vehicleRegistration: "ABC 123 XY",
    driverName: "David Wilson",
    tripDetails: {
      pickupLocation: "London Victoria Station",
      dropoffLocation: "Manchester Piccadilly",
      departureDate: "Saturday, 15 March 2024",
      departureTime: "09:00",
      passengerCount: 45,
    },
    portalUrl: "https://groupbus.co.uk/supplier/bookings/abc123",
  },
  "supplier-response-accepted": {
    supplierName: "Premier Coaches Ltd",
    bookingReference: "GB-BK-2024-00456",
    action: "accepted" as const,
    tripDetails: {
      pickupLocation: "London Victoria Station",
      dropoffLocation: "Manchester Piccadilly",
      departureDate: "Saturday, 15 March 2024",
    },
    bookingUrl: "https://groupbus.co.uk/bookings/abc123",
  },
  "supplier-response-rejected": {
    supplierName: "Premier Coaches Ltd",
    bookingReference: "GB-BK-2024-00456",
    action: "rejected" as const,
    reason: "Vehicle unavailable due to prior commitment on this date.",
    tripDetails: {
      pickupLocation: "London Victoria Station",
      dropoffLocation: "Manchester Piccadilly",
      departureDate: "Saturday, 15 March 2024",
    },
    bookingUrl: "https://groupbus.co.uk/bookings/abc123",
  },
  "trip-completion-customer": {
    recipientName: "John Smith",
    recipientType: "customer" as const,
    bookingReference: "GB-BK-2024-00456",
    tripDetails: {
      pickupLocation: "London Victoria Station",
      dropoffLocation: "Manchester Piccadilly",
      departureDate: "Saturday, 15 March 2024",
    },
    surveyUrl: "https://groupbus.co.uk/survey?booking=GB-BK-2024-00456",
  },
  "trip-completion-supplier": {
    recipientName: "Premier Coaches Ltd",
    recipientType: "supplier" as const,
    bookingReference: "GB-BK-2024-00456",
    tripDetails: {
      pickupLocation: "London Victoria Station",
      dropoffLocation: "Manchester Piccadilly",
      departureDate: "Saturday, 15 March 2024",
    },
  },
  "booking-cancellation-customer": {
    recipientName: "John Smith",
    recipientType: "customer" as const,
    bookingReference: "GB-BK-2024-00456",
    cancellationReason: "Customer requested cancellation due to change in travel plans.",
    tripDetails: {
      pickupLocation: "London Victoria Station",
      dropoffLocation: "Manchester Piccadilly",
      departureDate: "Saturday, 15 March 2024",
    },
    contactUrl: "https://groupbus.co.uk/contact",
  },
  "booking-cancellation-supplier": {
    recipientName: "Premier Coaches Ltd",
    recipientType: "supplier" as const,
    bookingReference: "GB-BK-2024-00456",
    cancellationReason: "Customer requested cancellation due to change in travel plans.",
    tripDetails: {
      pickupLocation: "London Victoria Station",
      dropoffLocation: "Manchester Piccadilly",
      departureDate: "Saturday, 15 March 2024",
    },
  },
  "magic-link-login": {
    magicLinkUrl: "https://groupbus.co.uk/api/auth/magic-link/verify?token=abc123xyz",
    expirationTime: "15 minutes",
    purpose: MagicLinkPurpose.LOGIN,
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0",
  },
  "magic-link-enquiry": {
    magicLinkUrl: "https://groupbus.co.uk/api/auth/magic-link/verify?token=def456uvw",
    expirationTime: "24 hours",
    purpose: MagicLinkPurpose.ENQUIRY_ACCESS,
    ipAddress: "10.0.0.50",
  },
  "magic-link-supplier": {
    magicLinkUrl: "https://groupbus.co.uk/api/auth/magic-link/verify?token=ghi789rst",
    expirationTime: "7 days",
    purpose: MagicLinkPurpose.SUPPLIER_ONBOARDING,
  },
  "supplier-invite": {
    magicLinkUrl: "https://groupbus.co.uk/api/auth/magic-link/verify?token=jkl012mno",
    organisationName: "Premier Coaches Ltd",
    expirationTime: "7 days",
    contactName: "David Wilson",
  },
  "enquiry-confirmation-with-dashboard": {
    customerName: "Sarah Johnson",
    enquiryReference: "GB-ENQ-2024-00789",
    tripDetails: {
      pickupLocation: "Birmingham New Street Station",
      dropoffLocation: "Edinburgh Waverley Station",
      departureDate: "22 April 2024",
      departureTime: "07:30",
      returnDate: "24 April 2024",
      returnTime: "19:00",
      passengerCount: 32,
      tripType: "Return Journey",
      specialRequirements: "Wheelchair accessible vehicle required. 2 passengers use wheelchairs.",
    },
    dashboardUrl: "https://groupbus.co.uk/api/auth/magic-link/verify?token=pqr345stu&redirectTo=/enquiries/abc123",
  },
};

const VALID_TEMPLATES = [
  "quote",
  "booking-confirmation",
  "enquiry-confirmation",
  "enquiry-confirmation-with-dashboard",
  "supplier-assignment",
  "supplier-response-accepted",
  "supplier-response-rejected",
  "trip-completion-customer",
  "trip-completion-supplier",
  "booking-cancellation-customer",
  "booking-cancellation-supplier",
  "magic-link-login",
  "magic-link-enquiry",
  "magic-link-supplier",
  "supplier-invite",
] as const;

type TemplateKey = (typeof VALID_TEMPLATES)[number];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const template = searchParams.get("template") as TemplateKey;

  if (!template || !SAMPLE_DATA[template]) {
    return NextResponse.json(
      {
        error: `Invalid template. Valid options: ${VALID_TEMPLATES.join(", ")}`,
        availableTemplates: VALID_TEMPLATES,
      },
      { status: 400 }
    );
  }

  try {
    let html: string;

    switch (template) {
      case "quote":
        html = await renderEmail({ type: "quote", props: SAMPLE_DATA.quote });
        break;
      case "booking-confirmation":
        html = await renderEmail({
          type: "booking-confirmation",
          props: SAMPLE_DATA["booking-confirmation"],
        });
        break;
      case "enquiry-confirmation":
        html = await renderEmail({
          type: "enquiry-confirmation",
          props: SAMPLE_DATA["enquiry-confirmation"],
        });
        break;
      case "supplier-assignment":
        html = await renderEmail({
          type: "supplier-assignment",
          props: SAMPLE_DATA["supplier-assignment"],
        });
        break;
      case "supplier-response-accepted":
        html = await renderEmail({
          type: "supplier-response",
          props: SAMPLE_DATA["supplier-response-accepted"],
        });
        break;
      case "supplier-response-rejected":
        html = await renderEmail({
          type: "supplier-response",
          props: SAMPLE_DATA["supplier-response-rejected"],
        });
        break;
      case "trip-completion-customer":
        html = await renderEmail({
          type: "trip-completion",
          props: SAMPLE_DATA["trip-completion-customer"],
        });
        break;
      case "trip-completion-supplier":
        html = await renderEmail({
          type: "trip-completion",
          props: SAMPLE_DATA["trip-completion-supplier"],
        });
        break;
      case "booking-cancellation-customer":
        html = await renderEmail({
          type: "booking-cancellation",
          props: SAMPLE_DATA["booking-cancellation-customer"],
        });
        break;
      case "booking-cancellation-supplier":
        html = await renderEmail({
          type: "booking-cancellation",
          props: SAMPLE_DATA["booking-cancellation-supplier"],
        });
        break;
      case "magic-link-login":
        html = await renderEmail({
          type: "magic-link",
          props: SAMPLE_DATA["magic-link-login"],
        });
        break;
      case "magic-link-enquiry":
        html = await renderEmail({
          type: "magic-link",
          props: SAMPLE_DATA["magic-link-enquiry"],
        });
        break;
      case "magic-link-supplier":
        html = await renderEmail({
          type: "magic-link",
          props: SAMPLE_DATA["magic-link-supplier"],
        });
        break;
      case "supplier-invite":
        html = await renderEmail({
          type: "supplier-invite",
          props: SAMPLE_DATA["supplier-invite"],
        });
        break;
      case "enquiry-confirmation-with-dashboard":
        html = await renderEmail({
          type: "enquiry-confirmation",
          props: SAMPLE_DATA["enquiry-confirmation-with-dashboard"],
        });
        break;
      default:
        return NextResponse.json({ error: "Unknown template" }, { status: 400 });
    }

    return NextResponse.json({ html, template, availableTemplates: VALID_TEMPLATES });
  } catch (error) {
    console.error("Email render error:", error);
    return NextResponse.json(
      { error: "Failed to render email template" },
      { status: 500 }
    );
  }
}
