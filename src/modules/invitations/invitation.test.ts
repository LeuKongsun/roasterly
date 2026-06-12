import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db/prisma.js";

const app = createApp();
const testRunId = Date.now();
const managerEmail = `invite-manager-${testRunId}@example.com`;
const staffEmail = `invite-staff-${testRunId}@example.com`;
const outsiderEmail = `invite-outsider-${testRunId}@example.com`;
const password = "correct-password";
const businessName = `Invite Test ${testRunId}`;

let managerToken: string;
let staffToken: string;
let outsiderToken: string;
let businessId: string;
let inviteToken: string;

describe("invitations", () => {
  beforeAll(async () => {
    managerToken = await registerAndGetAccessToken(managerEmail);
    staffToken = await registerAndGetAccessToken(staffEmail);
    outsiderToken = await registerAndGetAccessToken(outsiderEmail);

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
          startsWith: "Invite Test"
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [managerEmail, staffEmail, outsiderEmail]
        }
      }
    });
    await prisma.$disconnect();
  });

  it("allows a manager to create an invitation", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/invitations`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        email: staffEmail,
        role: "staff",
        displayName: "Invited Staff"
      });

    expect(response.status).toBe(201);
    expect(response.body.inviteToken).toEqual(expect.any(String));
    expect(response.body.invitation).toMatchObject({
      email: staffEmail,
      role: "staff",
      displayName: "Invited Staff"
    });
    expect(response.body.invitation.tokenHash).toBeUndefined();

    inviteToken = response.body.inviteToken;
  });

  it("lists invitations for managers", async () => {
    const response = await request(app)
      .get(`/businesses/${businessId}/invitations`)
      .set("authorization", `Bearer ${managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.invitations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: staffEmail
        })
      ])
    );
    expect(response.body.invitations[0].tokenHash).toBeUndefined();
  });

  it("blocks non-matching users from accepting an invitation", async () => {
    const response = await request(app)
      .post("/invitations/accept")
      .set("authorization", `Bearer ${outsiderToken}`)
      .send({
        token: inviteToken
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "INVITATION_EMAIL_MISMATCH"
    });
  });

  it("allows the invited user to accept an invitation", async () => {
    const response = await request(app)
      .post("/invitations/accept")
      .set("authorization", `Bearer ${staffToken}`)
      .send({
        token: inviteToken
      });

    expect(response.status).toBe(200);
    expect(response.body.member).toMatchObject({
      businessId,
      role: "staff",
      displayName: "Invited Staff",
      business: {
        name: businessName
      }
    });
  });

  it("rejects invitation reuse", async () => {
    const response = await request(app)
      .post("/invitations/accept")
      .set("authorization", `Bearer ${staffToken}`)
      .send({
        token: inviteToken
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({
      code: "INVALID_INVITATION"
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
