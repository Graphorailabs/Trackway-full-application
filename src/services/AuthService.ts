import { ApiService } from "./ApiService";

const FLOW_API_URL = import.meta.env.VITE_FLOW_API_URL as string;

const api = new ApiService(FLOW_API_URL);

export type AuthUser = { id: string; email: string };
export type VerifyOtpResponse = { token: string; user: AuthUser };

export async function requestOtp(email: string): Promise<void> {
  await api.postJson("/auth/otp/request", { email });
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<VerifyOtpResponse> {
  return api.postJson<VerifyOtpResponse>("/auth/otp/verify", { email, code });
}
