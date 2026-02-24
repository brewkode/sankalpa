// Prevent the module-level Supabase client creation from throwing
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({})),
}));

const { nextAuthIdToUuid } = require("../../lib/supabaseServer");

describe("nextAuthIdToUuid", () => {
  it("returns a string in UUID format", () => {
    const uuid = nextAuthIdToUuid("some-user-id");
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("is deterministic — same input always produces the same UUID", () => {
    const id = "google-sub-1234567890";
    expect(nextAuthIdToUuid(id)).toBe(nextAuthIdToUuid(id));
  });

  it("produces different UUIDs for different inputs", () => {
    expect(nextAuthIdToUuid("user-alpha")).not.toBe(
      nextAuthIdToUuid("user-beta")
    );
  });

  it("coerces non-string input to string without throwing", () => {
    expect(() => nextAuthIdToUuid(98765)).not.toThrow();
    // Numeric 98765 must coerce to "98765" and match the string version
    expect(nextAuthIdToUuid(98765)).toBe(nextAuthIdToUuid("98765"));
  });
});
