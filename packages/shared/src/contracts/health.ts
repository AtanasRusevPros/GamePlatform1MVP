export const healthRoutePath = "/health";

export type HealthStatus = "ok";

export interface HealthResponse {
  status: HealthStatus;
  checkedAt: string;
}

export const createHealthResponse = (status: HealthStatus, checkedAt = new Date()): HealthResponse => ({
  status,
  checkedAt: checkedAt.toISOString()
});

