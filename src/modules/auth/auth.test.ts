import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db/prisma.js";

const app = createApp();
const testEmail = `auth-${Date.now()}@example.com`;
const testPassword = "correct-password";

describe("auth", () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: testEmail
      }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: testEmail
      }
    });
    await prisma.$disconnect();
  });

  it("registers a user and returns tokens", async () => {
    const response = await request(app).post("/auth/register").send({
      email: testEmail,
      password: testPassword
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      email: testEmail
    });
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
  });

  it("rejects duplicate registration", async () => {
    const response = await request(app).post("/auth/register").send({
      email: testEmail,
      password: testPassword
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({
      code: "EMAIL_ALREADY_REGISTERED"
    });
  });

  it("rejects invalid login credentials", async () => {
    const response = await request(app).post("/auth/login").send({
      email: testEmail,
      password: "wrong-password"
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password"
    });
  });

  it("logs in and reads the current user with a bearer token", async () => {
    const loginResponse = await request(app).post("/auth/login").send({
      email: testEmail,
      password: testPassword
    });

    expect(loginResponse.status).toBe(200);

    const meResponse = await request(app)
      .get("/auth/me")
      .set("authorization", `Bearer ${loginResponse.body.accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user).toMatchObject({
      email: testEmail
    });
    expect(meResponse.body.user.passwordHash).toBeUndefined();
  });

  it("rotates refresh tokens", async () => {
    const loginResponse = await request(app).post("/auth/login").send({
      email: testEmail,
      password: testPassword
    });

    const refreshResponse = await request(app).post("/auth/refresh").send({
      refreshToken: loginResponse.body.refreshToken
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).not.toBe(loginResponse.body.refreshToken);

    const reuseResponse = await request(app).post("/auth/refresh").send({
      refreshToken: loginResponse.body.refreshToken
    });

    expect(reuseResponse.status).toBe(401);
    expect(reuseResponse.body.error).toMatchObject({
      code: "REFRESH_TOKEN_REUSED"
    });
  });

  it("revokes the refresh token on logout", async () => {
    const loginResponse = await request(app).post("/auth/login").send({
      email: testEmail,
      password: testPassword
    });

    const logoutResponse = await request(app).post("/auth/logout").send({
      refreshToken: loginResponse.body.refreshToken
    });

    expect(logoutResponse.status).toBe(204);

    const refreshResponse = await request(app).post("/auth/refresh").send({
      refreshToken: loginResponse.body.refreshToken
    });

    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body.error).toMatchObject({
      code: "REFRESH_TOKEN_REUSED"
    });
  });
});
