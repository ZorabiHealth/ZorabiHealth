// src/lib/validation.ts

/**
 * MED001: E.164 Phone Validation
 *
 * Valides phone numbers in E.164 international format
 * Used for contact alerts and phone-based notifications
 *
 * Format: +[country code][number]
 * Exemples valides:
 * - +33612345678 (France)
 * - +216XXXXXXXX (Tunisie)
 * - +1234567890 (USA)
 *
 * Exemples invalides:
 * - 06 12 34 56 78 (espaces)
 * - +33 6 12 34 56 78 (espaces)
 * - 1234567 (pas de +)
 */

/**
 * Valide un numéro de téléphone au format E.164 pur
 * @param phone - Numéro de téléphone à valider
 * @returns true si le format est correct, false sinon
 */
export function validateE164Phone(phone: string): boolean {
  // Regex E.164: +[1-9]d{1,14}
  // + : doit commencer par +
  // [1-9] : première digit doit être 1-9
  // \d{1,14} : suivi de 1 à 14 chiffres
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Nettoie un numéro de téléphone et le valide
 * Enlève les espaces, tirets, parenthèses avant validation
 *
 * @param phone - Numéro de téléphone à nettoyer et valider
 * @returns Objet avec isValid, cleanedPhone (si valide), et error (si invalide)
 */
export function cleanAndValidatePhone(phone: string): {
  isValid: boolean;
  cleanedPhone?: string;
  error?: string;
} {
  // Vérifier que c'est pas vide
  if (!phone || phone.trim() === "") {
    return {
      isValid: false,
      error: "Phone number or Telegram ID is required",
    };
  }

  const trimmed = phone.trim();

  // Check if it's a Telegram ID setting
  if (trimmed.toLowerCase().startsWith("telegram:") || trimmed.toLowerCase().startsWith("tg:")) {
    const parts = trimmed.split(":");
    const idVal = parts[1]?.trim();
    if (!idVal || !/^-?\d+$/.test(idVal)) {
      return {
        isValid: false,
        error: "Invalid Telegram ID. Format: telegram:123456789",
      };
    }
    return {
      isValid: true,
      cleanedPhone: `telegram:${idVal}`,
    };
  }

  // Enlever espaces, tirets, parenthèses, etc.
  const cleaned = trimmed.replace(/[\s\-\(\)]/g, "");

  // Vérifier qu'il commence par +
  if (!cleaned.startsWith("+")) {
    return {
      isValid: false,
      error:
        "Phone must start with + (e.g., +33612345678) or use Telegram format (telegram:1234567)",
    };
  }

  // Valider le format E.164
  if (validateE164Phone(cleaned)) {
    return {
      isValid: true,
      cleanedPhone: cleaned,
    };
  }

  // Si ça arrive ici = format invalide
  return {
    isValid: false,
    error: "Invalid phone format. Use E.164: +[country code][number] (1-15 digits total)",
  };
}

/**
 * Fonction pour tester rapidement
 * Exemples d'utilisation:
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
