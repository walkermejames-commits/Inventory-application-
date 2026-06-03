import { NextResponse } from "next/server";

function normalisePostcode(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postcode = normalisePostcode(searchParams.get("postcode") || "");

    if (postcode.length < 5) {
      return NextResponse.json({ addresses: [] });
    }

    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    const data = await response.json();

    if (!response.ok || !data?.result) {
      return NextResponse.json({ addresses: [] });
    }

    const result = data.result;
    const town = result.admin_district || result.parish || result.region || "";
    const formatted = [town, result.postcode].filter(Boolean).join(", ");

    return NextResponse.json({
      addresses: [
        {
          line1: "",
          town,
          county: result.admin_county || result.region || "",
          postcode: result.postcode || postcode,
          formatted: formatted || postcode,
        },
      ],
    });
  } catch {
    return NextResponse.json({ addresses: [] });
  }
}
