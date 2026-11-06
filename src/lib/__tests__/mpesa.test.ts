import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/mpesa";

describe("normalizePhone", () => {
  it("normalizes the common Kenyan formats to 2547XXXXXXXX", () => {
    expect(normalizePhone("0712345678")).toBe("254712345678");
    expect(normalizePhone("0112345678")).toBe("254112345678");
    expect(normalizePhone("+254712345678")).toBe("254712345678");
    expect(normalizePhone("254712345678")).toBe("254712345678");
    expect(normalizePhone("0712 345 678")).toBe("254712345678");
    expect(normalizePhone("0712-345-678")).toBe("254712345678");
  });

  it("rejects invalid numbers", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("0812345678")).toBeNull(); // not a 07/01 prefix
    expect(normalizePhone("071234567")).toBeNull(); // too short
    expect(normalizePhone("07123456789")).toBeNull(); // too long
    expect(normalizePhone("not a phone")).toBeNull();
  });
});
