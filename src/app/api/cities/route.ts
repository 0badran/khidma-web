import { NextRequest, NextResponse } from "next/server";
import { getCities } from "@/lib/api";

const ID = /^\d+$/;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id") ?? undefined;
  const governorateId = searchParams.get("governorateId") ?? undefined;
  if ((id && !ID.test(id)) || (governorateId && !ID.test(governorateId))) {
    return NextResponse.json({ cities: [] }, { status: 400 });
  }
  const locale = searchParams.get("locale") === "en" ? "en" : "ar";
  const q = (searchParams.get("q") ?? "").trim().slice(0, 60);
  try {
    const cities = await getCities(locale, { q, id, governorateId });
    return NextResponse.json({ cities });
  } catch {
    return NextResponse.json({ cities: [] }, { status: 502 });
  }
}
