/**
 * Users API functions.
 * getMe retrieves the current user's profile information using the stored JWT token.
 * This is used to display user info on the profile page and to check authentication status.
 */
import { api } from "./client";

export function getMe() {
  return api.get("/api/auth/me/");
}