import { apiClient } from "@/lib/api-client"
import { encryptPassword } from "@/lib/password-crypto"
import type { ApiResponse } from "@/types/api"

export type LoginPayload = {
  email: string
  password: string
}

export type LoginResponse = {
  access_token: string
  user_id: string
  role: string
}

export type RegisterPayload = {
  full_name: string
  email: string
  phone_number?: string
  whatsapp_number?: string
  cnic_national_id: string
  degree_program_id: string
  registration_roll_number: string
  graduation_year: string
  media_id: string
  /** Institution selected on the signup form (IAM tenant UUID). */
  tenant_id: string
}

export type RegisterResponse = {
  registration_id: string
  reference_number: string
  status: string
  submitted_at: string
  photo_url?: string | null
  message: string
}

export type UploadPhotoResponse = {
  media_id: string
  public_url: string
}

export type ResetPasswordPayload = {
  token: string
  password: string
}

export type ActivateResponse = {
  reset_token: string
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const encryptedPassword = await encryptPassword(payload.password)
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
      "/auth/login",
      {
        email: payload.email,
        password: encryptedPassword,
      },
    )
    return data.data
  },

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const { data } = await apiClient.post<ApiResponse<RegisterResponse>>(
      "/auth/register",
      payload,
      {
        headers: {
          "x-tenant-id": payload.tenant_id,
        },
      },
    )
    return (
      data.data ?? {
        registration_id: "",
        reference_number: "",
        status: "PENDING",
        submitted_at: new Date().toISOString(),
        message: data.message || "Registration submitted",
      }
    )
  },

  async uploadPhoto(file: File): Promise<UploadPhotoResponse> {
    const formData = new FormData()
    formData.append("file", file)

    const { data } = await apiClient.post<ApiResponse<UploadPhotoResponse>>(
      "/auth/upload-photo",
      formData,
    )
    return data.data
  },

  async activate(token: string): Promise<ActivateResponse> {
    const { data } = await apiClient.post<ApiResponse<ActivateResponse>>(
      "/auth/activate",
      { token },
    )
    return data.data
  },

  async resendActivation(email: string): Promise<void> {
    await apiClient.post("/auth/resend-activation", { email })
  },

  async forgotPassword(email: string): Promise<{ message?: string }> {
    const { data } = await apiClient.post<
      ApiResponse<{ message?: string } | null>
    >("/auth/forgot-password", { email })
    return data.data ?? { message: data.message }
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    const encryptedPassword = await encryptPassword(payload.password)
    await apiClient.post("/auth/reset-password", {
      token: payload.token,
      password: encryptedPassword,
    })
  },
}
