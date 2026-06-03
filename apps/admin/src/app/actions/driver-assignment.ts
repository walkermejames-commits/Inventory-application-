"use server";

import { revalidatePath } from "next/cache";
import { assignDriverToBooking } from "@/lib/driver-assignment";

type AssignDriverActionInput = {
  bookingId: string;
  driverId: string;
};

type AssignDriverActionResult = {
  success: boolean;
  error?: string;
};

export async function assignDispatchDriverAction(
  input: AssignDriverActionInput
): Promise<AssignDriverActionResult> {
  try {
    await assignDriverToBooking(input.bookingId, input.driverId, "dispatch");
    revalidatePath("/dispatch");
    revalidatePath("/operations");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not assign driver" };
  }
}

export async function assignOperationsDriverAction(
  input: AssignDriverActionInput
): Promise<AssignDriverActionResult> {
  try {
    await assignDriverToBooking(input.bookingId, input.driverId, "operations");
    revalidatePath("/operations");
    revalidatePath("/dispatch");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not assign driver" };
  }
}
