import { describe, expect, it } from "vitest";
import {
  canPerformBookingAction,
  extractAccessToken,
  hashAccessToken,
  resolveBookingAccess,
} from "./booking-access";

describe("seller booking access (IDOR prevention)", () => {
  const buyerToken = "buyer-secret-token-abc";
  const sellerToken = "seller-secret-token-xyz";
  const buyerHash = hashAccessToken(buyerToken);
  const sellerHash = hashAccessToken(sellerToken);

  it("rejects missing token (random bookingId alone)", () => {
    const result = resolveBookingAccess({
      providedToken: null,
      buyerTokenHash: buyerHash,
      sellerTokenHash: sellerHash,
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.status).toBe(401);
    }
  });

  it("rejects wrong token", () => {
    const result = resolveBookingAccess({
      providedToken: "not-the-right-token",
      buyerTokenHash: buyerHash,
      sellerTokenHash: sellerHash,
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.status).toBe(403);
    }
  });

  it("accepts correct buyer token for read/quote/checkout", () => {
    const result = resolveBookingAccess({
      providedToken: buyerToken,
      buyerTokenHash: buyerHash,
      sellerTokenHash: sellerHash,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.role).toBe("buyer");
      expect(canPerformBookingAction(result.role, "read")).toBe(true);
      expect(canPerformBookingAction(result.role, "quote_confirm")).toBe(true);
      expect(canPerformBookingAction(result.role, "checkout")).toBe(true);
      expect(canPerformBookingAction(result.role, "seller_flags")).toBe(false);
    }
  });

  it("accepts correct seller token for seller flags only", () => {
    const result = resolveBookingAccess({
      providedToken: sellerToken,
      buyerTokenHash: buyerHash,
      sellerTokenHash: sellerHash,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.role).toBe("seller");
      expect(canPerformBookingAction(result.role, "read")).toBe(true);
      expect(canPerformBookingAction(result.role, "seller_flags")).toBe(true);
      expect(canPerformBookingAction(result.role, "checkout")).toBe(false);
      expect(canPerformBookingAction(result.role, "quote_confirm")).toBe(false);
    }
  });

  it("extracts token from query/header/body sources", () => {
    expect(
      extractAccessToken({
        queryToken: "from-query",
        headerToken: null,
        bearerToken: null,
        bodyToken: null,
      })
    ).toBe("from-query");

    expect(
      extractAccessToken({
        queryToken: null,
        headerToken: "from-header",
        bearerToken: null,
        bodyToken: "from-body",
      })
    ).toBe("from-header");
  });
});
