import { api } from "./client";

export function getMessages() {
  return api.get("/api/messages/");
}

export function sendMessage(data) {
  return api.post("/api/messages/", data);
}

export function markMessageRead(id) {
  return api.patch(`/api/messages/${id}/read/`, {});
}