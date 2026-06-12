import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db/prisma.js";

const app = createApp();
const testRunId = Date.now();
const managerEmail = `member-manager-${testRunId}@example.com`;
const staffEmail = `member-staff-${testRunId}@example.com`;
const otherStaffEmail = `member-other-staff-${testRunId}@example.com`;
const outsiderEmail = `member-outsider-${testRunId}@example.com`;
const password = "correct-password";
const businessName = `Member Test ${testRunId}`;

let managerToken: string;
let staffToken: string;
let outsiderToken: string;
let businessId: string;
let staffMemberId: string;

describe("members", () => {
  beforeAll(async () => {
    managerToken = await registerAndGetAccessToken(managerEmail);
    staffToken = await registerAndGetAccessToken(staffEmail);
    outsiderToken = await registerAndGetAccessToken(outsiderEmail);
    await registerAndGetAccessToken(otherStaffEmail);

    const businessResponse = await request(app)
      .post("/businesses")
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        name: businessName
      });

    businessId = businessResponse.body.business.id;
  });

  afterAll(async () => {
    await prisma.business.deleteMany({
      where: {
        name: {
          startsWith: "Member Test"
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [managerEmail, staffEmail, otherStaffEmail, outsiderEmail]
        }
      }
    });
    await prisma.$disconnect();
  });

  it("allows a manager to add an existing user as staff", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        email: staffEmail,
        role: "staff",
        displayName: "Staff Member"
      });

    expect(response.status).toBe(201);
    expect(response.body.member).toMatchObject({
      role: "staff",
      displayName: "Staff Member",
      user: {
        email: staffEmail
      }
    });

    staffMemberId = response.body.member.id;
  });

  it("rejects duplicate memberships", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        email: staffEmail
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({
      code: "MEMBER_ALREADY_EXISTS"
    });
  });

  it("blocks staff from adding another member", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${staffToken}`)
      .send({
        email: otherStaffEmail
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "MANAGER_ROLE_REQUIRED"
    });
  });

  it("blocks non-members from listing members", async () => {
    const response = await request(app)
      .get(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${outsiderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "MEMBERSHIP_REQUIRED"
    });
  });

  it("allows business members to list members", async () => {
    const response = await request(app)
      .get(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: staffMemberId,
          user: expect.objectContaining({
            email: staffEmail
          })
        })
      ])
    );
  });
});

async function registerAndGetAccessToken(email: string) {
  const response = await request(app).post("/auth/register").send({
    email,
    password
  });

  expect(response.status).toBe(201);

  return response.body.accessToken as string;
}
