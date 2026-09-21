// Username rules shared by registration (RegisterScreen) and the profile
// rename dialog (EditUsernameDialog), so both reject the same input.
//
// The 20-character ceiling sits well under the 100-character limit
// `firestore.rules` enforces on `presence.displayName`, so a rename can never
// produce a name the presence write path would then reject.

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

const ALLOWED_CHARACTERS = /^[A-Za-z0-9 _-]+$/;

export type UsernameValidation =
  { ok: true; value: string } | { ok: false; message: string };

export function validateUsername(raw: string): UsernameValidation {
  const value = raw.trim();

  if (value.length < USERNAME_MIN_LENGTH) {
    return {
      ok: false,
      message: `Username must be at least ${USERNAME_MIN_LENGTH} characters.`
    };
  }

  if (value.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Username must be at most ${USERNAME_MAX_LENGTH} characters.`
    };
  }

  if (!ALLOWED_CHARACTERS.test(value)) {
    return {
      ok: false,
      message: "Username can only use letters, numbers, spaces, - and _."
    };
  }

  return { ok: true, value };
}
