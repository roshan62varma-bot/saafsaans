/**
 * Removes control characters, zero-width and bidi-override characters (used to hide
 * prompt-injection payloads), collapses runs of whitespace and caps length.
 */
export function sanitizeText(input: string, maxLength: number): string {
  return input
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[​-‏‪-‮⁠-⁤﻿]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}
