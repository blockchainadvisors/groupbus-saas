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

const TASK_TYPE_SHORT: Record<string, string> = {
  EMAIL_PARSER: "Email",
  ENQUIRY_ANALYZER: "Enquiry",
  SUPPLIER_SELECTOR: "Supplier",
  BID_EVALUATOR: "Bid",
  MARKUP_CALCULATOR: "Markup",
  QUOTE_CONTENT: "Quote",
  JOB_DOCUMENTS: "Docs",
  EMAIL_PERSONALIZER: "Personal",
};

export function AiActivityTable({ data }: AiActivityTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">AI Activity</CardTitle>
        <CardAction>
          <Link
            href="/ai-decisions"
            className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No AI activity yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Task</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Action</TableHead>
                  <TableHead className="text-xs">Conf.</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Auto</TableHead>
                  <TableHead className="text-xs text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((log, i) => {
                  const pct = Math.round(log.confidenceScore * 100);
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-[10px] sm:text-xs py-2 sm:py-4">
                        <span className="hidden sm:inline">{TASK_TYPE_LABELS[log.taskType] ?? log.taskType}</span>
                        <span className="sm:hidden">{TASK_TYPE_SHORT[log.taskType] ?? log.taskType}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-2 sm:py-4">
                        <StatusBadge status={log.actionTaken} size="sm" />
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="h-1.5 sm:h-2 w-10 sm:w-16 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor:
                                  pct >= 80
                                    ? "#10b981"
                                    : pct >= 60
                                      ? "#f59e0b"
                                      : "#ef4444",
                              }}
                            />
                          </div>
                          <span className="text-[10px] sm:text-xs tabular-nums font-medium">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-2 sm:py-4">
                        {log.autoExecuted ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-[10px] sm:text-xs py-2 sm:py-4">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
