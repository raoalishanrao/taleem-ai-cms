import { isValidPhoneNumber, type Value as E164Number } from "react-phone-number-input"

export const CNIC_PATTERN = /^\d{5}-\d{7}-\d$/
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MIN_GRADUATION_YEAR = 1980
export const MAX_GRADUATION_YEAR = new Date().getFullYear()
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export type RegistrationValues = {
  full_name: string
  email: string
  phone_number?: E164Number
  whatsapp_number?: E164Number
  cnic_national_id: string
  degree_program_id: string
  registration_roll_number: string
  graduation_year: string
  tenant_id?: string
  photo?: File | null
}

export type RegistrationField =
  | keyof RegistrationValues
  | "form"

export type RegistrationErrors = Partial<Record<RegistrationField, string>>

function requiredText(value: string, label: string) {
  if (!value.trim()) return `${label} is required`
  return null
}

export function validateRegistration(
  values: RegistrationValues,
): RegistrationErrors {
  const errors: RegistrationErrors = {}

  if (!values.tenant_id?.trim()) {
    errors.tenant_id = "Please select your institution"
  }

  const fullName = values.full_name.trim()
  if (!fullName) {
    errors.full_name = "Full name is required"
  } else if (fullName.length < 2) {
    errors.full_name = "Full name must be at least 2 characters"
  } else if (fullName.length > 150) {
    errors.full_name = "Full name must be at most 150 characters"
  }

  const email = values.email.trim()
  if (!email) {
    errors.email = "Email is required"
  } else if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    errors.email = "Enter a valid email address"
  }

  if (values.phone_number) {
    if (!isValidPhoneNumber(values.phone_number)) {
      errors.phone_number = "Enter a valid phone number"
    } else if (values.phone_number.length > 20) {
      errors.phone_number = "Phone number is too long"
    }
  }

  if (values.whatsapp_number) {
    if (!isValidPhoneNumber(values.whatsapp_number)) {
      errors.whatsapp_number = "Enter a valid WhatsApp number"
    } else if (values.whatsapp_number.length > 20) {
      errors.whatsapp_number = "WhatsApp number is too long"
    }
  }

  const cnic = values.cnic_national_id.trim()
  if (!cnic) {
    errors.cnic_national_id = "CNIC / National ID is required"
  } else if (!CNIC_PATTERN.test(cnic)) {
    errors.cnic_national_id = "Enter a valid CNIC / National ID"
  }

  if (!values.degree_program_id) {
    errors.degree_program_id = "Please select a degree program"
  }

  const roll = values.registration_roll_number.trim()
  const rollError = requiredText(roll, "Registration / Roll number")
  if (rollError) {
    errors.registration_roll_number = rollError
  } else if (roll.length > 50) {
    errors.registration_roll_number =
      "Registration / Roll number must be at most 50 characters"
  }

  const year = values.graduation_year.trim()
  if (!year) {
    errors.graduation_year = "Graduation year is required"
  } else {
    const numericYear = Number(year)
    if (
      !/^\d{4}$/.test(year) ||
      numericYear < MIN_GRADUATION_YEAR ||
      numericYear > MAX_GRADUATION_YEAR
    ) {
      errors.graduation_year = `Select a year between ${MIN_GRADUATION_YEAR} and ${MAX_GRADUATION_YEAR}`
    }
  }

  if (!values.photo) {
    errors.photo = "Profile photo is required"
  } else if (!values.photo.type.startsWith("image/")) {
    errors.photo = "Profile photo must be an image file"
  } else if (values.photo.size > MAX_PHOTO_BYTES) {
    errors.photo = "Profile photo must be 5MB or smaller"
  }

  return errors
}

export function validatePhotoFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Profile photo must be an image file"
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Profile photo must be 5MB or smaller"
  }
  return null
}

/** Formats CNIC as #####-#######-# while typing. */
export function formatCnicInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 13)
  const part1 = digits.slice(0, 5)
  const part2 = digits.slice(5, 12)
  const part3 = digits.slice(12, 13)

  if (digits.length <= 5) return part1
  if (digits.length <= 12) return `${part1}-${part2}`
  return `${part1}-${part2}-${part3}`
}
