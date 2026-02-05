"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { ArrowRight, Check, X } from "lucide-react";

interface AiActivity {
  taskType: string;
  actionTaken: string;
  confidenceScore: number;
  createdAt: string;
  autoExecuted: boolean;
}

interface AiActivityTableProps {
  data: AiActivity[];
}

const TASK_TYPE_LABELS: Record<string, string> = {
  EMAIL_PARSER: "Email Parser",
  ENQUIRY_ANALYZER: "Enquiry Analyzer",
  SUPPLIER_SELECTOR: "Supplier Selector",
  BID_EVALUATOR: "Bid Evaluator",
  MARKUP_CALCULATOR: "Markup Calculator",
  QUOTE_CONTENT: "Quote Content",
  JOB_DOCUMENTS: "Job Documents",
  EMAIL_PERSONALIZER: "Email Personalizer",
};

export function AiActivityTable({ data }: AiActivityTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Activity</CardTitle>
        <CardAction>
          <Link
            href="/ai-decisions"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No AI activity yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Auto</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((log, i) => {
                const pct = Math.round(log.confidenceScore * 100);
                return (
                  <TableRow key={i}>
                    <TableCell className="text-xs">
                      {TASK_TYPE_LABELS[log.taskType] ?? log.taskType}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.actionTaken} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                pct >= 80
                                  ? "var(--color-chart-2)"
                                  : pct >= 60
                                    ? "var(--color-chart-4)"
                                    : "var(--color-chart-5)",
                            }}
                          />
                        </div>
                        <span className="text-xs tabular-nums font-medium">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.autoExecuted ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(log.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
