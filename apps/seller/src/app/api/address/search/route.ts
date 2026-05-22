import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const postcode = request.nextUrl.searchParams.get("postcode")?.trim();

    if (!postcode) {
      return NextResponse.json({ addresses: [] });
    }

    const apiKey = process.env.GETADDRESS_API_KEY;

    if (apiKey) {
      const response = await fetch(
        `https://api.getAddress.io/find/${encodeURIComponent(postcode)}?api-key=${apiKey}&expand=true`,
        {
          headers: {
            Accept: "application/json",
          },
          next: { revalidate: 60 },
        }
      );

      if (response.ok) {
        const data = await response.json();

        const addresses = Array.isArray(data?.addresses)
          ? data.addresses.map((address: any) => ({
              line1: address.line_1 || address.line_2 || address.formatted_address?.[0] || "",
              line2: address.line_2 || "",
              town: address.town_or_city || "",
              county: address.county || "",
              postcode: data.postcode || postcode,
              formatted: Array.isArray(address.formatted_address)
                ? address.formatted_address.filter(Boolean).join(", ")
                : [address.line_1, address.line_2, address.town_or_city, data.postcode]
                    .filter(Boolean)
                    .join(", "),
            }))
          : [];

        return NextResponse.json({ addresses });
      }
    }

    const fallbackResponse = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    const fallbackData = await fallbackResponse.json();

    if (!fallbackResponse.ok || !fallbackData?.result) {
      return NextResponse.json({ addresses: [] });
    }

    const result = fallbackData.result;

    return NextResponse.json({
      addresses: [
        {
          line1: "",
          town: result.admin_district || result.admin_ward || "",
          county: result.region || "",
          postcode: result.postcode || postcode,
          formatted: `${result.postcode} · ${result.admin_district || result.admin_ward || "UK"}`,
        },
      ],
    });
  } catch {
    return NextResponse.json({ addresses: [] });
  }
}
