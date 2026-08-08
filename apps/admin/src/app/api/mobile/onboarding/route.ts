import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import { gateMobileApi, isNextResponse } from "@/lib/auth";

const requiredDocumentTypes = [
  "driving_licence_front",
  "driving_licence_back",
  "right_to_work",
  "business_insurance",
  "liability_insurance",
  "selfie_with_licence",
];

const asBool = (value: unknown) => value === true || value === "true" || value === "on";
const asString = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function POST(request: Request) {
  try {
    const auth = gateMobileApi(request);
    if (isNextResponse(auth)) return auth;

    const body = await request.json();

    const fullName = asString(body.fullName);
    const email = asString(body.email).toLowerCase();
    const phone = asString(body.phone);
    const legalName = asString(body.legalName) || fullName;
    const dateOfBirth = asString(body.dateOfBirth) || null;
    const homeAddress = asString(body.homeAddress);

    const vehicleType = asString(body.vehicleType) || "car";
    const registration = asString(body.registration).toUpperCase();
    const make = asString(body.make);
    const model = asString(body.model);
    const colour = asString(body.colour);
    const capacityNotes = asString(body.capacityNotes);

    const rightToWorkConfirmed = asBool(body.rightToWorkConfirmed);
    const businessInsuranceConfirmed = asBool(body.businessInsuranceConfirmed);
    const liabilityInsuranceConfirmed = asBool(body.liabilityInsuranceConfirmed);

    const documents = Array.isArray(body.documents) ? body.documents : [];

    if (!fullName || !email || !phone || !homeAddress) {
      return NextResponse.json({ error: "Name, email, phone and home address are required" }, { status: 400 });
    }

    if (!registration || !make || !model) {
      return NextResponse.json({ error: "Vehicle registration, make and model are required" }, { status: 400 });
    }

    if (!rightToWorkConfirmed || !businessInsuranceConfirmed || !liabilityInsuranceConfirmed) {
      return NextResponse.json({ error: "Required declarations must be confirmed" }, { status: 400 });
    }

    const suppliedDocumentTypes = new Set(documents.map((document: any) => asString(document.documentType)));
    const missingDocuments = requiredDocumentTypes.filter((documentType) => !suppliedDocumentTypes.has(documentType));

    if (missingDocuments.length > 0) {
      return NextResponse.json({ error: `Missing required documents: ${missingDocuments.join(", ")}` }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        role: "driver",
        full_name: fullName,
        email,
        phone,
      })
      .select("id")
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: userError?.message || "Could not create driver user" }, { status: 400 });
    }

    const { data: driver, error: driverError } = await supabase
      .from("driver_profiles")
      .insert({
        user_id: user.id,
        status: "pending",
        onboarding_status: "pending_review",
        legal_name: legalName,
        date_of_birth: dateOfBirth,
        home_address: homeAddress,
        right_to_work_confirmed: rightToWorkConfirmed,
        business_insurance_confirmed: businessInsuranceConfirmed,
        liability_insurance_confirmed: liabilityInsuranceConfirmed,
        current_availability: false,
        service_radius_miles: 12,
        onboarding_completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (driverError || !driver) {
      return NextResponse.json({ error: driverError?.message || "Could not create driver profile" }, { status: 400 });
    }

    const { error: vehicleError } = await supabase
      .from("vehicles")
      .insert({
        driver_id: driver.id,
        vehicle_type: vehicleType,
        registration,
        make,
        model,
        colour,
        capacity_notes: capacityNotes,
        active: true,
      });

    if (vehicleError) {
      return NextResponse.json({ error: vehicleError.message }, { status: 400 });
    }

    const documentRows = documents.map((document: any) => ({
      driver_id: driver.id,
      document_type: asString(document.documentType),
      file_url: asString(document.fileUrl),
      file_name: asString(document.fileName) || asString(document.documentType),
      expiry_date: asString(document.expiryDate) || null,
      verification_status: "pending_review",
    }));

    const { error: documentError } = await supabase
      .from("driver_documents")
      .insert(documentRows);

    if (documentError) {
      return NextResponse.json({ error: documentError.message }, { status: 400 });
    }

    await supabase.from("audit_events").insert({
      actor_role: "driver",
      action: "driver_onboarding_submitted",
      entity_type: "driver_profile",
      entity_id: driver.id,
      metadata: {
        email,
        registration,
        document_count: documentRows.length,
      },
    });

    return NextResponse.json({
      success: true,
      driverId: driver.id,
      onboardingStatus: "pending_review",
      message: "Your paperwork is with the FC for review.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit onboarding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
