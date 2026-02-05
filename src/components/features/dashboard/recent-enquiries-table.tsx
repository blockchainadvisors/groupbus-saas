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
      <CardHeader>
        <CardTitle>Recent Enquiries</CardTitle>
        <CardAction>
          <Link
            href="/enquiries"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No enquiries yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((enquiry) => (
                <TableRow key={enquiry.referenceNumber}>
                  <TableCell className="font-mono text-xs">
                    {enquiry.referenceNumber}
                  </TableCell>
                  <TableCell>{enquiry.contactName}</TableCell>
                  <TableCell>
                    {enquiry.tripType && (
                      <Badge variant="outline" className="text-xs">
                        {TRIP_TYPE_LABELS[enquiry.tripType] ?? enquiry.tripType}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={enquiry.status} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(enquiry.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
