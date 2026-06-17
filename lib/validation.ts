// src/lib/validation.ts

/**
 * MED001: E.164 Phone Validation
 *
 * Validates phone numbers in E.164 international format
 * Used for contact alerts and phone-based notifications
 *
 * Format: +[country code][number]
 * Valid examples:
 * - +33612345678 (France)
 * - +216XXXXXXXX (Tunisia)
 * - +1234567890 (USA)
 *
 * Invalid examples:
 * - 06 12 34 56 78 (spaces)
 * - +33 6 12 34 56 78 (spaces)
 * - 1234567 (no + prefix)
 */

/**
 * Validates a phone number in pure E.164 format
 * @param phone - Phone number to validate
 * @returns true if format is correct, false otherwise
 */
export function validateE164Phone(phone: string): boolean {
  // Regex E.164: +[1-9]d{1,14}
  // + : must start with +
  // [1-9] : first digit must be 1-9
  // \d{1,14} : followed by 1 to 14 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Cleans a phone number and validates it
 * Removes spaces, dashes, parentheses before validation
 *
 * @param phone - Phone number to clean and validate
 * @returns Object with isValid, cleanedPhone (if valid), and error (if invalid)
 */
export function cleanAndValidatePhone(phone: string): {
  isValid: boolean;
  cleanedPhone?: string;
  error?: string;
} {
  // Check it's not empty
  if (!phone || phone.trim() === "") {
    return {
      isValid: false,
      error: "Phone number is required",
    };
  }

  const trimmed = phone.trim();

  // Remove spaces, dashes, parentheses, etc.
  const cleaned = trimmed.replace(/[\s\-\(\)]/g, "");

  // Verify it starts with +
  if (!cleaned.startsWith("+")) {
    return {
      isValid: false,
      error: "Phone must start with + (e.g., +33612345678)",
    };
  }

  // Validate E.164 format
  if (validateE164Phone(cleaned)) {
    return {
      isValid: true,
      cleanedPhone: cleaned,
    };
  }

  // If we reach here = invalid format
  return {
    isValid: false,
    error: "Invalid phone format. Use E.164: +[country code][number] (1-15 digits total)",
  };
}

/**
 * Quick test function
 * Usage examples:
 *
 * const result1 = cleanAndValidatePhone("+33 6 12 34 56 78");
 * if (result1.isValid) {
 *   console.log("Valid:", result1.cleanedPhone); // +33612345678
 * }
 *
 * const result2 = cleanAndValidatePhone("06 12 34 56 78");
 * if (!result2.isValid) {
 *   console.log("Error:", result2.error); // Phone must start with +
 * }
 */
