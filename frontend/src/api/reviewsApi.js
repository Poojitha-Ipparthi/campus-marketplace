import { api } from "./client";

export function getReviews(params = {}) {
  return api.get("/api/reviews/", { params });
}

export function getReview(id) {
  return api.get(`/api/reviews/${id}/`);
}