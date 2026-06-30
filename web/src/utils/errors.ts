import { ApiError } from "../api";

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

export function isAuthExpiredError(error: unknown) {
  return error instanceof ApiError && error.status === 401 && error.code === "INVALID_TOKEN";
}
