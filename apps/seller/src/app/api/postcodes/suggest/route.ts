import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() || "";

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(query)}/autocomplete`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    return NextResponse.json({
      suggestions: Array.isArray(data?.result) ? data.result.slice(0, 8) : [],
    });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
