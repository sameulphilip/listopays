import { NextResponse } from "next/server";
import { createCustomer, listCustomers } from "@/lib/listopays";
import { logActivity, mutateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const customers = await listCustomers();
    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not load customers",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 },
      );
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Email is invalid" },
        { status: 400 },
      );
    }
    const uuid = await createCustomer({ name, email });
    mutateStore((store) => {
      logActivity(store, {
        kind: "customer",
        title: `New customer: ${name}`,
        detail: email,
      });
    });
    return NextResponse.json({ success: true, data: { uuid, name, email } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not create customer",
      },
      { status: 502 },
    );
  }
}
