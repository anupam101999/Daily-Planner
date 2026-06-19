import { authorizedRequest } from "./apiClient";

export function getAdminInsights() {
  return authorizedRequest("/api/admin/insights");
}

export function getAdminBatches() {
  return authorizedRequest("/api/admin/batches");
}

export function runAdminBatch(batchId) {
  return authorizedRequest(`/api/admin/batches/${encodeURIComponent(batchId)}/run`, { method: "POST" });
}
