/**
 * Reviews API functions.
 * Supports filtering by order ID, reviewer, and reviewee via query params.
 */

import { api } from "./client";

export function getReviews(params = {}) {
  return api.get("/api/reviews/", { params });
}

export function getReview(id) {
  return api.get(`/api/reviews/${id}/`);
}