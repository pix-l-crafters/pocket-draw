import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  validateUsername
} from "./username";

describe("validateUsername", () => {
  test("accepts a name and strips surrounding whitespace", () => {
    expect(validateUsername("  Quick Draw  ")).toEqual({
      ok: true,
      value: "Quick Draw"
    });
  });

  test("accepts hyphens, underscores and digits", () => {
    expect(validateUsername("duel-master_99")).toEqual({
      ok: true,
      value: "duel-master_99"
    });
  });

  test("rejects a name shorter than the minimum after trimming", () => {
    const result = validateUsername("  ab  ");

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty(
      "message",
      `Username must be at least ${USERNAME_MIN_LENGTH} characters.`
    );
  });

  test("rejects a blank name", () => {
    expect(validateUsername("   ").ok).toBe(false);
  });

  test("rejects a name longer than the maximum", () => {
    const result = validateUsername("a".repeat(USERNAME_MAX_LENGTH + 1));

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty(
      "message",
      `Username must be at most ${USERNAME_MAX_LENGTH} characters.`
    );
  });

  test("accepts a name exactly at the maximum length", () => {
    expect(validateUsername("a".repeat(USERNAME_MAX_LENGTH)).ok).toBe(true);
  });

  test("rejects characters outside the allowed set", () => {
    expect(validateUsername("draw@home").ok).toBe(false);
    expect(validateUsername("draw/slash").ok).toBe(false);
  });
});
