// Prevent next-auth and its Google provider from making real network calls
jest.mock("next-auth", () => ({ default: jest.fn() }));
jest.mock("next-auth/providers/google", () =>
  jest.fn(() => ({ id: "google", name: "Google", type: "oauth" }))
);

const { authOptions } = require("../../lib/auth");

describe("authOptions", () => {
  describe("jwt callback", () => {
    it("adds user.id to token when a user object is provided", async () => {
      const result = await authOptions.callbacks.jwt({
        token: { sub: "sub-123" },
        user: { id: "user-id-456" },
      });
      expect(result.id).toBe("user-id-456");
    });

    it("passes the token through unchanged when no user object is present", async () => {
      const token = { sub: "sub-123", id: "existing-id" };
      const result = await authOptions.callbacks.jwt({ token, user: null });
      expect(result).toEqual(token);
    });
  });

  describe("session callback", () => {
    it("sets session.user.id from token.id", async () => {
      const session = { user: { name: "Alice", email: "alice@example.com" } };
      const result = await authOptions.callbacks.session({
        session,
        token: { id: "token-id-789", sub: "sub-000" },
      });
      expect(result.user.id).toBe("token-id-789");
    });

    it("falls back to token.sub when token.id is absent", async () => {
      const session = { user: { name: "Bob" } };
      const result = await authOptions.callbacks.session({
        session,
        token: { sub: "sub-fallback-999" },
      });
      expect(result.user.id).toBe("sub-fallback-999");
    });

    it("does not throw when session has no user property", async () => {
      const result = await authOptions.callbacks.session({
        session: {},
        token: { id: "some-id" },
      });
      expect(result.user).toBeUndefined();
    });
  });

  describe("static configuration", () => {
    it("uses jwt as the session strategy", () => {
      expect(authOptions.session.strategy).toBe("jwt");
    });

    it("sets maxAge to 30 days in seconds", () => {
      expect(authOptions.session.maxAge).toBe(30 * 24 * 60 * 60);
    });

    it("sets the sign-in page to /login", () => {
      expect(authOptions.pages.signIn).toBe("/login");
    });

    it("includes Google as the only provider", () => {
      expect(authOptions.providers).toHaveLength(1);
      expect(authOptions.providers[0]).toMatchObject({ id: "google" });
    });
  });
});
