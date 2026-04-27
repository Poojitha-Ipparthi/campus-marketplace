import { api } from "./client";

export function createOrder(data) {
  return api.post("/api/orders/", data);
}

export function getOrders() {
  return api.get("/api/orders/");
}

export function cancelOrder(id) {
  return api.post(`/api/orders/${id}/cancel/`);
}