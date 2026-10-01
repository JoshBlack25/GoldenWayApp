import { describe, it, expect } from "vitest";
import { productLabel, isUnlimited } from "./productLabels";
import {
  formatIdNumber,
  luhnValid,
  idNumberValid,
  deriveDobFromId,
} from "./saId";

describe("productLabel (shared)", () => {
  it("labels Go Easy products with their ride count", () => {
    expect(productLabel("GOEASY-5")).toBe("Go Easy 5-Ride");
    expect(productLabel("GOEASY-48")).toBe("Go Easy 48-Ride");
  });

  it("labels route-bound and zone products", () => {
    expect(productLabel("WEEKLY-KHA-CPT")).toBe("Weekly Pass");
    expect(productLabel("MONTHLY-MP-CPT")).toBe("Monthly Pass");
    expect(productLabel("FLEXI-Z1")).toBe("Flexi Zone");
  });

  it("falls back to the raw code for unknown products", () => {
    expect(productLabel("SOMETHING-NEW")).toBe("SOMETHING-NEW");
  });

  it("handles empty codes", () => {
    expect(productLabel("")).toBe("GoldenWay Pass");
    expect(productLabel(null)).toBe("GoldenWay Pass");
  });
});

describe("isUnlimited (shared)", () => {
  it("marks weekly/monthly as unlimited (journeys = 0)", () => {
    expect(isUnlimited("WEEKLY-KHA-CPT")).toBe(true);
    expect(isUnlimited("MONTHLY")).toBe(true);
    expect(isUnlimited("GOEASY-10")).toBe(false);
    expect(isUnlimited("")).toBe(false);
  });
});

describe("formatIdNumber", () => {
  it("groups an SA ID as 6-4-3 and caps at 13 digits", () => {
    expect(formatIdNumber("9001015800088")).toBe("900101 5800 088");
    expect(formatIdNumber("900101 5800 08899")).toBe("900101 5800 088");
    expect(formatIdNumber("900101")).toBe("900101");
    expect(formatIdNumber("9001015")).toBe("900101 5");
  });
});

describe("luhnValid (backend contract)", () => {
  it("accepts a checksum-valid SA ID", () => {
    expect(luhnValid("9001015800088")).toBe(true);
  });

  it("rejects a transposed digit", () => {
    expect(luhnValid("9001015800058")).toBe(false);
  });

  it("rejects a wrong length before Luhn even matters", () => {
    expect(idNumberValid("900101580008")).toBe(false); // 12 digits
  });
});

describe("deriveDobFromId", () => {
  it("derives the birth date from the first 6 digits", () => {
    expect(deriveDobFromId("9001015800088")).toBe("1990-01-01");
  });

  it("maps recent years to the 2000s", () => {
    const dob = deriveDobFromId("1003025800085");
    expect(dob).toBe("2010-03-02");
  });

  it("returns empty for impossible dates", () => {
    expect(deriveDobFromId("9013325800085")).toBe(""); // month 13
  });

  it("returns empty when fewer than 6 digits", () => {
    expect(deriveDobFromId("90010")).toBe("");
  });
});
