/**
 * Password validation for Moratta platform.
 * Requirements: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit.
 */

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate a password against Moratta requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Senha deve ter no mínimo 8 caracteres")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra maiúscula")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra minúscula")
  }

  if (!/\d/.test(password)) {
    errors.push("Senha deve conter pelo menos um número")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
