import { quickSentiment } from "@/lib/sentiment";

describe("quickSentiment", () => {
  it("prefers rating when provided", () => {
    expect(quickSentiment("anything", 5)).toBe("POSITIVE");
    expect(quickSentiment("love this", 1)).toBe("NEGATIVE");
    expect(quickSentiment("meh", 3)).toBe("NEUTRAL");
  });

  it("detects positive wording without a rating", () => {
    expect(quickSentiment("This is amazing and helpful")).toBe("POSITIVE");
  });

  it("detects negative wording without a rating", () => {
    expect(quickSentiment("App crash and terrible bug")).toBe("NEGATIVE");
  });

  it("returns NEUTRAL for mixed or empty signals", () => {
    expect(quickSentiment("good but also bad")).toBe("NEUTRAL");
    expect(quickSentiment("shipped yesterday")).toBe("NEUTRAL");
  });
});
