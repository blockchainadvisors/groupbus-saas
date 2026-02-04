import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"; label?: string }> = {
  // Enquiry statuses
  DRAFT: { variant: "secondary" },
  SUBMITTED: { variant: "info" },
  UNDER_REVIEW: { variant: "warning" },
  SENT_TO_SUPPLIERS: { variant: "info", label: "Sent to Suppliers" },
  QUOTES_RECEIVED: { variant: "info", label: "Quotes Received" },
  QUOTE_SENT: { variant: "warning", label: "Quote Sent" },
  ACCEPTED: { variant: "success" },
  CANCELLED: { variant: "destructive" },
  EXPIRED: { variant: "secondary" },

  // Supplier Quote statuses
  REQUESTED: { variant: "info" },
  // SUBMITTED already defined
  // UNDER_REVIEW already defined
  REJECTED: { variant: "destructive" },

  // Customer Quote statuses
  MARKUP_APPLIED: { variant: "warning", label: "Markup Applied" },
  SENT_TO_CUSTOMER: { variant: "info", label: "Sent to Customer" },

  // Booking statuses
  CONFIRMED: { variant: "success" },
  SUPPLIER_ASSIGNED: { variant: "info", label: "Supplier Assigned" },
  SUPPLIER_ACCEPTED: { variant: "success", label: "Supplier Accepted" },
  SUPPLIER_REJECTED: { variant: "destructive", label: "Supplier Rejected" },
  PRE_TRIP_READY: { variant: "success", label: "Pre-trip Ready" },
  IN_PROGRESS: { variant: "warning", label: "In Progress" },
  COMPLETED: { variant: "success" },

  // Payment statuses
  PENDING: { variant: "warning" },
  SUCCEEDED: { variant: "success" },
  FAILED: { variant: "destructive" },
  REFUNDED: { variant: "secondary" },
  PARTIALLY_REFUNDED: { variant: "warning", label: "Partially Refunded" },

  // AI action statuses
  AUTO_EXECUTED: { variant: "success", label: "Auto Executed" },
  ESCALATED_TO_HUMAN: { variant: "warning", label: "Escalated" },
  OVERRIDDEN: { variant: "info" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] || { variant: "outline" as const };
  const label = style.label || status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");

  return (
    <Badge variant={style.variant} className={cn(className)}>
      {label}
    </Badge>
  );
}
