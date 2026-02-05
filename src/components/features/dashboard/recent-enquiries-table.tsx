"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface RecentEnquiry {
  referenceNumber: string;
  status: string;
  contactName: string;
  createdAt: string;
  tripType: string | null;
  pickupLocation: string | null;
}

interface RecentEnquiriesTableProps {
  data: RecentEnquiry[];
}

const TRIP_TYPE_LABELS: Record<string, string> = {
  ONE_WAY: "One Way",
  RETURN: "Return",
  MULTI_STOP: "Multi-Stop",
};

export function RecentEnquiriesTable({ data }: RecentEnquiriesTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Enquiries</CardTitle>
        <CardAction>
          <Link
            href="/enquiries"
            className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No enquiries yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Ref #</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Customer</TableHead>
                  <TableHead className="text-xs">Trip</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((enquiry) => (
                  <TableRow key={enquiry.referenceNumber}>
                    <TableCell className="font-mono text-[10px] sm:text-xs py-2 sm:py-4">
                      <span className="hidden sm:inline">{enquiry.referenceNumber}</span>
                      <span className="sm:hidden">{enquiry.referenceNumber.split("-").pop()}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm py-2 sm:py-4">
                      {enquiry.contactName}
                    </TableCell>
                    <TableCell className="py-2 sm:py-4">
                      {enquiry.tripType && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                          {TRIP_TYPE_LABELS[enquiry.tripType] ?? enquiry.tripType}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2 sm:py-4">
                      <StatusBadge status={enquiry.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-[10px] sm:text-xs py-2 sm:py-4">
                      {new Date(enquiry.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
