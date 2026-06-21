import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db/prisma.js";

const app = createApp();
const testRunId = Date.now();
const managerEmail = `member-manager-${testRunId}@example.com`;
const staffEmail = `member-staff-${testRunId}@example.com`;
const createdStaffEmail = `member-created-staff-${testRunId}@example.com`;
const otherStaffEmail = `member-other-staff-${testRunId}@example.com`;
const outsiderEmail = `member-outsider-${testRunId}@example.com`;
const password = "correct-password";
const updatedStaffPassword = "new-staff-password";
const businessName = `Member Test ${testRunId}`;

let managerToken: string;
let staffToken: string;
let outsiderToken: string;
let businessId: string;
let staffMemberId: string;
let otherStaffMemberId: string;

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
          in: [managerEmail, staffEmail, createdStaffEmail, otherStaffEmail, outsiderEmail]
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
        displayName: "Staff Member",
        phoneNumber: "0400 000 001"
      });

    expect(response.status).toBe(201);
    expect(response.body.member).toMatchObject({
      role: "staff",
      displayName: "Staff Member",
      phoneNumber: "0400 000 001",
      user: {
        email: staffEmail
      }
    });

    staffMemberId = response.body.member.id;
  });

  it("allows a manager to create a staff user while adding them", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        email: createdStaffEmail,
        password: "created-staff-password",
        role: "staff",
        displayName: "Created Staff"
      });

    expect(response.status).toBe(201);
    expect(response.body.member).toMatchObject({
      displayName: "Created Staff",
      user: {
        email: createdStaffEmail
      }
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: createdStaffEmail,
      password: "created-staff-password"
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user).toMatchObject({
      email: createdStaffEmail
    });
  });

  it("allows a manager to update member details", async () => {
    const response = await request(app)
      .patch(`/businesses/${businessId}/members/${staffMemberId}`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        displayName: "Updated Staff",
        role: "staff",
        phoneNumber: "0400 000 002"
      });

    expect(response.status).toBe(200);
    expect(response.body.member).toMatchObject({
      displayName: "Updated Staff",
      role: "staff",
      phoneNumber: "0400 000 002"
    });
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

  it("allows staff to list only their own membership", async () => {
    const otherMemberResponse = await request(app)
      .post(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        email: otherStaffEmail
      });

    expect(otherMemberResponse.status).toBe(201);
    otherStaffMemberId = otherMemberResponse.body.member.id;

    const response = await request(app)
      .get(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0]).toMatchObject({
      id: staffMemberId,
      user: {
        email: staffEmail
      }
    });
  });

  it("allows a manager to reset a staff member password", async () => {
    const response = await request(app)
      .patch(`/businesses/${businessId}/members/${staffMemberId}/password`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        password: updatedStaffPassword
      });

    expect(response.status).toBe(204);

    const oldLoginResponse = await request(app).post("/auth/login").send({
      email: staffEmail,
      password
    });
    expect(oldLoginResponse.status).toBe(401);

    const newLoginResponse = await request(app).post("/auth/login").send({
      email: staffEmail,
      password: updatedStaffPassword
    });
    expect(newLoginResponse.status).toBe(200);
    expect(newLoginResponse.body.user).toMatchObject({
      email: staffEmail
    });
    expect(newLoginResponse.body.user.passwordHash).toBeUndefined();
  });

  it("blocks staff from resetting member passwords", async () => {
    const response = await request(app)
      .patch(`/businesses/${businessId}/members/${staffMemberId}/password`)
      .set("authorization", `Bearer ${staffToken}`)
      .send({
        password: "another-password"
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "MANAGER_ROLE_REQUIRED"
    });
  });

  it("rejects updating a member email to an existing business member", async () => {
    const response = await request(app)
      .patch(`/businesses/${businessId}/members/${staffMemberId}`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        email: otherStaffEmail
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({
      code: "MEMBER_ALREADY_EXISTS"
    });
    expect(otherStaffMemberId).toBeTruthy();
  });

  it("allows a manager to update a member email to another existing user", async () => {
    const response = await request(app)
      .patch(`/businesses/${businessId}/members/${staffMemberId}`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        email: outsiderEmail
      });

    expect(response.status).toBe(200);
    expect(response.body.member).toMatchObject({
      user: {
        email: outsiderEmail
      }
    });
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
