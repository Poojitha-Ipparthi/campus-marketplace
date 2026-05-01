/**
 * Admin dashboard API functions.
 * All endpoints require is_staff = true on the backend — requests
 * from non-staff users will be rejected.
 */

import { api } from "./client";

export function getAdminStats() {
    return api.get("/api/auth/admin/stats/");
}

export function getAdminUsers() {
    return api.get("/api/auth/admin/users/");
}

export function updateAdminUser(id, data) {
    return api.patch(`/api/auth/admin/users/${id}/`, data);
}

export function deactivateAdminUser(id) {
    return api.post(`/api/auth/admin/users/${id}/deactivate/`);
}

export function getAdminListings() {
    return api.get("/api/auth/admin/listings/");
}

export function updateAdminListing(id, data) {
    return api.patch(`/api/auth/admin/listings/${id}/`, data);
}

export function deleteAdminListing(id) {
    return api.delete(`/api/auth/admin/listings/${id}/delete/`);
}

export function getAdminOrders() {
    return api.get("/api/auth/admin/orders/");
}

export function getAdminPayments() {
    return api.get("/api/auth/admin/payments/");
}
