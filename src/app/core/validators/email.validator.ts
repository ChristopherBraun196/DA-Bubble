import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Local part, domain labels and a top-level domain of at least two letters.
 *
 * @remarks
 * Deliberately stricter than Angular's built-in check, which already accepts
 * `name@host` and therefore lets a forgotten `.de` through.
 */
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

/**
 * Validates an email address down to its top-level domain.
 *
 * @param control - The control holding the address.
 * @returns `{ email: true }` for a malformed address, otherwise `null`.
 *
 * @remarks
 * Reports the same `email` key as {@link Validators.email}, so existing error
 * messages keep working. An empty field stays the job of `Validators.required`
 * and passes here.
 */
export function emailAddress(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return EMAIL_PATTERN.test(value) ? null : { email: true };
}
