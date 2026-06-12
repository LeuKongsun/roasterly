import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

describe("app", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns health status", async () => {
    const response = await request(createApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "roster-api"
    });
  });

  it("returns a structured 404 for unknown routes", async () => {
    const response = await request(createApp()).get("/missing");

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: "ROUTE_NOT_FOUND",
      message: "Route not found: GET /missing"
    });
  });

  it("rate limits auth mutation endpoints outside test mode", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const app = createApp();

    for (let index = 0; index < 10; index += 1) {
      await request(app).post("/auth/login").send({
        email: "rate-limit@example.com",
        password: "incorrect-password"
      });
    }

    const response = await request(app).post("/auth/login").send({
      email: "rate-limit@example.com",
      password: "incorrect-password"
    });

    expect(response.status).toBe(429);
    expect(response.body.error).toMatchObject({
      code: "RATE_LIMITED"
    });
  });
});
