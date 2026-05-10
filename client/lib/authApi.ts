import type {
  AuthLoginApiBody,
  AuthLoginApiResponse,
  UpsertStudentAccountApiBody,
  UpsertStudentAccountApiResponse,
  UpdateWardenAccountApiBody,
  UpdateWardenAccountApiResponse,
  GenerateStudentOtpApiBody,
  GenerateStudentOtpApiResponse,
  VerifyStudentOtpApiBody,
  VerifyStudentOtpApiResponse,
} from "@shared/api";

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return body?.message || fallback;
}

export async function loginUserAccount(payload: AuthLoginApiBody): Promise<AuthLoginApiResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to validate login"));
  }

  return (await response.json()) as AuthLoginApiResponse;
}

export async function updateWardenAccount(
  payload: UpdateWardenAccountApiBody,
): Promise<UpdateWardenAccountApiResponse> {
  const response = await fetch("/api/auth/warden", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update warden account"));
  }

  return (await response.json()) as UpdateWardenAccountApiResponse;
}

export async function upsertStudentAccount(
  payload: UpsertStudentAccountApiBody,
): Promise<UpsertStudentAccountApiResponse> {
  const response = await fetch("/api/auth/student", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update student account"));
  }

  return (await response.json()) as UpsertStudentAccountApiResponse;
}

export async function generateStudentOtp(payload: GenerateStudentOtpApiBody): Promise<GenerateStudentOtpApiResponse> {
  const response = await fetch("/api/auth/student/otp/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to generate OTP"));
  }

  return (await response.json()) as GenerateStudentOtpApiResponse;
}

export async function verifyStudentOtp(payload: VerifyStudentOtpApiBody): Promise<VerifyStudentOtpApiResponse> {
  const response = await fetch("/api/auth/student/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to verify OTP"));
  }

  return (await response.json()) as VerifyStudentOtpApiResponse;
}