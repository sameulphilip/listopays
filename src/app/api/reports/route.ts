import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { syncPendingPayments } from "@/lib/payment-status";
import { buildReport, reportCsv } from "@/lib/reports";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await syncPendingPayments();
  const session = await currentSession();
  const { searchParams } = new URL(request.url);
  const report = buildReport(readStore(), searchParams.get("range"));
  const isAdmin = session?.role === "admin";

  if (searchParams.get("format") === "csv") {
    return new NextResponse(reportCsv(report.rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leez-pay-report-${report.range}.csv"`,
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...report,
      charges: isAdmin ? report.charges : 0,
      refunds: isAdmin ? report.refunds : 0,
    },
  });
}
