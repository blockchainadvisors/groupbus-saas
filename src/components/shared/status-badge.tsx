import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, {
  variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
  label: string;
  shortLabel: string;
}> = {
  // Enquiry statuses
  DRAFT: { variant: "secondary", label: "Draft", shortLabel: "Draft" },
  SUBMITTED: { variant: "info", label: "Submitted", shortLabel: "Submitted" },
  UNDER_REVIEW: { variant: "warning", label: "Under Review", shortLabel: "Review" },
  SENT_TO_SUPPLIERS: { variant: "info", label: "Sent to Suppliers", shortLabel: "To Suppliers" },
  QUOTES_RECEIVED: { variant: "info", label: "Quotes Received", shortLabel: "Quotes In" },
  QUOTE_SENT: { variant: "warning", label: "Quote Sent", shortLabel: "Sent" },
  ACCEPTED: { variant: "success", label: "Accepted", shortLabel: "Accepted" },
  CANCELLED: { variant: "destructive", label: "Cancelled", shortLabel: "Cancelled" },
  EXPIRED: { variant: "secondary", label: "Expired", shortLabel: "Expired" },

  // Supplier Quote statuses
  REQUESTED: { variant: "info", label: "Requested", shortLabel: "Requested" },
  REJECTED: { variant: "destructive", label: "Rejected", shortLabel: "Rejected" },

  // Customer Quote statuses
  MARKUP_APPLIED: { variant: "warning", label: "Markup Applied", shortLabel: "Markup" },
  SENT_TO_CUSTOMER: { variant: "info", label: "Sent to Customer", shortLabel: "Sent" },

  // Booking statuses
  CONFIRMED: { variant: "success", label: "Confirmed", shortLabel: "Confirmed" },
  SUPPLIER_ASSIGNED: { variant: "info", label: "Supplier Assigned", shortLabel: "Assigned" },
  SUPPLIER_ACCEPTED: { variant: "success", label: "Supplier Accepted", shortLabel: "Accepted" },
  SUPPLIER_REJECTED: { variant: "destructive", label: "Supplier Rejected", shortLabel: "Rejected" },
  PRE_TRIP_READY: { variant: "success", label: "Pre-trip Ready", shortLabel: "Ready" },
  IN_PROGRESS: { variant: "warning", label: "In Progress", shortLabel: "Active" },
  COMPLETED: { variant: "success", label: "Completed", shortLabel: "Done" },

  // Payment statuses
  PENDING: { variant: "warning", label: "Pending", shortLabel: "Pending" },
  SUCCEEDED: { variant: "success", label: "Succeeded", shortLabel: "Paid" },
  FAILED: { variant: "destructive", label: "Failed", shortLabel: "Failed" },
  REFUNDED: { variant: "secondary", label: "Refunded", shortLabel: "Refunded" },
  PARTIALLY_REFUNDED: { variant: "warning", label: "Partially Refunded", shortLabel: "Partial" },

  // AI action statuses
  AUTO_EXECUTED: { variant: "success", label: "Auto Executed", shortLabel: "Auto" },
  ESCALATED_TO_HUMAN: { variant: "warning", label: "Escalated", shortLabel: "Escalated" },
  OVERRIDDEN: { variant: "info", label: "Overridden", shortLabel: "Override" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "default";
}

export function StatusBadge({ status, className, size = "default" }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    variant: "outline" as const,
    label: status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " "),
    shortLabel: status.slice(0, 8),
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        size === "sm" && "text-[10px] px-1.5 py-0",
        className
      )}
    >
      <span className="hidden sm:inline">{config.label}</span>
      <span className="sm:hidden">{config.shortLabel}</span>
    </Badge>
  );
}
