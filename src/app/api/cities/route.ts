import { NextRequest, NextResponse } from "next/server";
import { getCities } from "@/lib/api";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const governorateId = searchParams.get("governorateId");
  if (!governorateId || !/^\d+$/.test(governorateId)) {
    return NextResponse.json({ cities: [] }, { status: 400 });
  }
  const locale = searchParams.get("locale") === "en" ? "en" : "ar";
  const q = (searchParams.get("q") ?? "").trim().slice(0, 60);
  try {
    const cities = await getCities(locale, governorateId, q);
    return NextResponse.json({ cities });
  } catch {
    return NextResponse.json({ cities: [] }, { status: 502 });
  }
}
