/**
 * Listings API functions.
 * getListings accepts filter params (seller, status, category, etc.)
 * that map to Django query parameters on the backend.
 */

import { api } from "./client";

export function getListings(params = {}) {
  return api.get("/api/listings/", { params });
}

export function getListing(id) {
  return api.get(`/api/listings/${id}/`);
}

export function getCategories() {
  return api.get("/api/listings/categories/");
}