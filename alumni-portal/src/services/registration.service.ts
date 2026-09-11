import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"

export type RegistrationTenant = {
  id: string
  code: string
  displayName: string
}

export const registrationService = {
  async listTenants(): Promise<RegistrationTenant[]> {
    const { data } = await apiClient.get<
      ApiResponse<RegistrationTenant[]>
    >("/public/tenants-for-registration", {
      params: { applicationCode: "ALUMNI" },
    })
    return Array.isArray(data.data) ? data.data : []
  },
}
