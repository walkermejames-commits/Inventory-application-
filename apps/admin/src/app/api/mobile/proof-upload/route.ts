import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import { gateMobileApi, isNextResponse } from "@/lib/auth";

const ALLOWED_TYPES = new Set(["pickup_proof", "delivery_proof", "item", "damage_report"]);

/**
 * Upload proof photo bytes to Supabase Storage and return a server-side storage path.
 * Pilot auth: MOBILE_API_SECRET + x-driver-id matching driverId.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const driverId = typeof body.driverId === "string" ? body.driverId.trim() : "";
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const photoType = typeof body.photoType === "string" ? body.photoType.trim() : "";
    const contentType =
      typeof body.contentType === "string" ? body.contentType.trim() : "image/jpeg";
    const base64 = typeof body.base64 === "string" ? body.base64 : "";

    if (!driverId || !bookingId || !photoType || !base64) {
      return NextResponse.json(
        { error: "driverId, bookingId, photoType and base64 are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(photoType)) {
      return NextResponse.json({ error: "Invalid photoType" }, { status: 400 });
    }

    const auth = gateMobileApi(request, { expectedDriverId: driverId });
    if (isNextResponse(auth)) return auth;

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id,driver_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.driver_id !== driverId) {
      return NextResponse.json({ error: "Not your booking" }, { status: 403 });
    }

    const raw = base64.includes(",") ? base64.split(",")[1] : base64;
    let bytes: Buffer;
    try {
      bytes = Buffer.from(raw, "base64");
    } catch {
      return NextResponse.json({ error: "Invalid base64 payload" }, { status: 400 });
    }

    if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Photo must be between 1 byte and 8MB" },
        { status: 400 }
      );
    }

    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const storagePath = `proofs/${bookingId}/${photoType}-${Date.now()}.${ext}`;
    const bucket = process.env.SUPABASE_PROOF_BUCKET || "booking-proofs";

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, bytes, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          error: "Storage upload failed",
          detail: uploadError.message,
          hint: `Ensure bucket "${bucket}" exists in Supabase Storage (see migration 006)`,
        },
        { status: 500 }
      );
    }

    // Record photo row for audit (progress route also inserts; this is pre-verification evidence)
    const { error: photoError } = await supabase.from("photos").insert({
      booking_id: bookingId,
      uploaded_by_user_id: driverId,
      photo_type: photoType,
      storage_path: storagePath,
    });

    if (photoError) {
      // Best-effort cleanup of orphan object
      await supabase.storage.from(bucket).remove([storagePath]);
      return NextResponse.json(
        { error: `Photo metadata insert failed: ${photoError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      storagePath,
      bucket,
      photoType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
