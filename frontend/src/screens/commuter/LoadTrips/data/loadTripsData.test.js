import { describe, it, expect } from "vitest";
import {
  BR03_MESSAGE,
  ROUTE_LABELS,
  productLabel,
  isUnlimited,
  formatCurrency,
  formatCents,
  detectCardBrand,
  mapProduct,
  mapRoute,
  MAX_SAVED_CARDS,
} from "./loadTripsData";

describe("productLabel", () => {
  it("labels Go Easy products with their ride count", () => {
    expect(productLabel("GOEASY-5")).toBe("Go Easy 5-Ride");
    expect(productLabel("GOEASY-48")).toBe("Go Easy 48-Ride");
  });

  it("labels route-bound and zone products", () => {
    expect(productLabel("WEEKLY-KHA-CPT")).toBe("Weekly Pass");
    expect(productLabel("MONTHLY-MP-CPT")).toBe("Monthly Pass");
    expect(productLabel("FLEXI-SOUTH")).toBe("Flexi Zone");
  });

  it("falls back to the raw code for unknown products", () => {
    expect(productLabel("MYSTERY-9")).toBe("MYSTERY-9");
    expect(productLabel(null)).toBe("GoldenWay Pass");
  });
});

describe("isUnlimited", () => {
  it("marks weekly/monthly as unlimited (journeys = 0)", () => {
    expect(isUnlimited("WEEKLY-BELL-CPT")).toBe(true);
    expect(isUnlimited("MONTHLY-KHA-CPT")).toBe(true);
    expect(isUnlimited("GOEASY-10")).toBe(false);
    expect(isUnlimited(null)).toBe(false);
  });
});

describe("mapProduct", () => {
  it("maps a backend FareProductResponse into the UI plan shape", () => {
    const plan = mapProduct({
      code: "GOEASY-5",
      family: "GO_EASY",
      journeys: 5,
      validDays: 14,
      transfersAllowed: 1,
      priceCents: 13000,
    });
    expect(plan).toEqual({
      id: "GOEASY-5",
      label: "Go Easy 5-Ride",
      family: "GO_EASY",
      trips: 5,
      validDays: 14,
      transfersAllowed: 1,
      priceCents: 13000,
      goEasy: true,
    });
  });

  it("does not mark weekly products as Go Easy", () => {
    const plan = mapProduct({
      code: "WEEKLY-KHA-CPT",
      family: "WEEKLY",
      journeys: 0,
      validDays: 7,
      transfersAllowed: 0,
      priceCents: 42000,
    });
    expect(plan.goEasy).toBe(false);
    expect(plan.trips).toBe(0);
  });
});

describe("mapRoute", () => {
  it("maps a backend RouteResponse into the UI route shape", () => {
    const route = mapRoute({
      code: "KHA-CPT",
      name: "Khayelitsha to City",
      origin: "Khayelitsha",
      destination: "City Bowl",
      goEasyEligible: true,
    });
    expect(route.id).toBe("KHA-CPT");
    expect(route.from).toBe("Khayelitsha");
    expect(route.to).toBe("City Bowl");
    expect(route.goEasyEligible).toBe(true);
  });

  it("falls back to origin → destination when no friendly label exists", () => {
    const route = mapRoute({
      code: "X-Y",
      origin: "X",
      destination: "Y",
      goEasyEligible: false,
    });
    expect(route.label).toBe("X → Y");
  });
});

describe("route labels", () => {
  it("covers the seeded GABS shortlist", () => {
    expect(Object.keys(ROUTE_LABELS)).toContain("KHA-CPT");
    expect(Object.keys(ROUTE_LABELS)).toContain("PAARL-BELL");
    expect(ROUTE_LABELS["KHA-CPT"]).toContain("Khayelitsha");
  });
});

describe("formatCurrency / formatCents", () => {
  it("formats rand amounts with two decimals", () => {
    expect(formatCurrency(25.3)).toBe("R25.30");
    expect(formatCurrency(126.5)).toBe("R126.50");
  });

  it("formats cents without float drift", () => {
    expect(formatCents(13000)).toBe("R130.00");
    expect(formatCents(1050)).toBe("R10.50");
    expect(formatCents(null)).toBe("R0.00");
  });
});

describe("detectCardBrand", () => {
  it("detects Visa and Mastercard from spaced input", () => {
    expect(detectCardBrand("4111 1111 1111 1111")).toBe("Visa");
    expect(detectCardBrand("5500 0000 0000 0004")).toBe("Mastercard");
  });

  it("falls back to a generic brand", () => {
    expect(detectCardBrand("1234 5678")).toBe("Card");
    expect(detectCardBrand("")).toBe("Card");
  });
});

describe("BR-03 exclusion copy", () => {
  it("carries the GABS exclusion wording verbatim", () => {
    expect(BR03_MESSAGE).toBe(
      "Go Easy is not available on this route. Please choose Weekly, Monthly, or cash.",
    );
  });
});

describe("saved cards", () => {
  it("caps the wallet at three methods", () => {
    expect(MAX_SAVED_CARDS).toBe(3);
  });
});
