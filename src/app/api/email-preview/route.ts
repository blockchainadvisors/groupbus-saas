import { NextRequest, NextResponse } from "next/server";
import { renderEmail } from "@/lib/email/render";

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
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const template = searchParams.get("template") as keyof typeof SAMPLE_DATA;

  if (!template || !SAMPLE_DATA[template]) {
    return NextResponse.json(
      { error: "Invalid template. Valid options: quote, booking-confirmation, enquiry-confirmation" },
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
      default:
        return NextResponse.json({ error: "Unknown template" }, { status: 400 });
    }

    return NextResponse.json({ html, template });
  } catch (error) {
    console.error("Email render error:", error);
    return NextResponse.json(
      { error: "Failed to render email template" },
      { status: 500 }
    );
  }
}
