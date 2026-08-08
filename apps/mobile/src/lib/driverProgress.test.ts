import { describe, expect, it } from "vitest";
import { DRIVER_STATUS_CHAIN } from "@door-in-four/shared";
import {
  buildProgressRequestBody,
  getNextDriverStatus,
  jobFetchQuery,
  progressEndpointPath,
  validateProgressMutation,
} from "./driverProgress";

describe("mobile driver progression helpers", () => {
  it("uses the shared DRIVER_STATUS_CHAIN through to completed", () => {
    expect(DRIVER_STATUS_CHAIN).toContain("pickup_verified");
    expect(DRIVER_STATUS_CHAIN).toContain("delivery_verified");
    expect(DRIVER_STATUS_CHAIN[DRIVER_STATUS_CHAIN.length - 1]).toBe("completed");
    expect(DRIVER_STATUS_CHAIN).toContain("delivered");
  });

  it("returns exact next step and null after completed", () => {
    expect(getNextDriverStatus("driver_assigned")).toBe("driver_en_route_to_pickup");
    expect(getNextDriverStatus("delivered")).toBe("completed");
    expect(getNextDriverStatus("completed")).toBe(null);
    expect(getNextDriverStatus("seller_quote_pending")).toBe(null);
  });

  it("rejects skip transitions via validateProgressMutation", () => {
    const result = validateProgressMutation({
      bookingId: "b1",
      driverId: "d1",
      fromStatus: "driver_assigned",
      toStatus: "completed",
    });
    expect(result.ok).toBe(false);
  });

  it("requires seller code + photo for pickup_verified", () => {
    expect(
      validateProgressMutation({
        bookingId: "b1",
        driverId: "d1",
        fromStatus: "driver_arrived_at_pickup",
        toStatus: "pickup_verified",
      }).ok
    ).toBe(false);

    expect(
      validateProgressMutation({
        bookingId: "b1",
        driverId: "d1",
        fromStatus: "driver_arrived_at_pickup",
        toStatus: "pickup_verified",
        sellerCode: "123456",
        photoPath: "file://pickup.jpg",
      }).ok
    ).toBe(true);
  });

  it("requires buyer code + photo for delivery_verified", () => {
    expect(
      validateProgressMutation({
        bookingId: "b1",
        driverId: "d1",
        fromStatus: "driver_arrived_at_delivery",
        toStatus: "delivery_verified",
        buyerCode: "999",
      }).ok
    ).toBe(false);

    expect(
      validateProgressMutation({
        bookingId: "b1",
        driverId: "d1",
        fromStatus: "driver_arrived_at_delivery",
        toStatus: "delivery_verified",
        buyerCode: "999999",
        photoPath: "file://delivery.jpg",
      }).ok
    ).toBe(true);
  });

  it("builds progress body with verification fields only when needed", () => {
    expect(
      buildProgressRequestBody({
        bookingId: "b1",
        driverId: "d1",
        fromStatus: "driver_assigned",
        toStatus: "driver_en_route_to_pickup",
      })
    ).toEqual({
      driverId: "d1",
      toStatus: "driver_en_route_to_pickup",
    });

    expect(
      buildProgressRequestBody({
        bookingId: "b1",
        driverId: "d1",
        fromStatus: "driver_arrived_at_pickup",
        toStatus: "pickup_verified",
        sellerCode: "ABC",
        photoPath: "path/photo.jpg",
      })
    ).toEqual({
      driverId: "d1",
      toStatus: "pickup_verified",
      sellerCode: "ABC",
      photoPath: "path/photo.jpg",
    });
  });

  it("builds correct endpoint paths", () => {
    expect(progressEndpointPath("job-123")).toBe(
      "/api/drivers/jobs/job-123/progress"
    );
    expect(jobFetchQuery("driver-1", "job-123")).toContain("driverId=driver-1");
    expect(jobFetchQuery("driver-1", "job-123")).toContain("bookingId=job-123");
  });

  it("rejects local file URIs for verification photoPath at validation boundary", async () => {
    const { isLocalDevicePhotoPath } = await import("@door-in-four/shared");
    expect(isLocalDevicePhotoPath("file:///data/user/0/photo.jpg")).toBe(true);
    // Server storage path from proof-upload is acceptable
    expect(isLocalDevicePhotoPath("proofs/booking-id/pickup_proof-1.jpg")).toBe(
      false
    );
  });
});
