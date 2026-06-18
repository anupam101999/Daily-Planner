import { authorizedRequest } from "./apiClient";

export function getAdminInsights() {
  return authorizedRequest("/api/admin/insights");
}
