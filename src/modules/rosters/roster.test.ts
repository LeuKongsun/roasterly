import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db/prisma.js";

const app = createApp();
const testRunId = Date.now();
const managerEmail = `roster-manager-${testRunId}@example.com`;
const staffEmail = `roster-staff-${testRunId}@example.com`;
const outsiderEmail = `roster-outsider-${testRunId}@example.com`;
const password = "correct-password";
const businessName = `Roster Publish Test ${testRunId}`;
const weekStart = "2026-06-15";

let managerToken: string;
let staffToken: string;
let outsiderToken: string;
let businessId: string;
let publicationId: string;

describe("roster publications", () => {
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

    await request(app)
      .post(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        email: staffEmail,
        displayName: "Roster Staff"
      });
  });

  afterAll(async () => {
    await prisma.business.deleteMany({
      where: {
        name: {
          startsWith: "Roster Publish Test"
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

  it("allows a manager to publish a roster week", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/rosters/publish`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        weekStart
      });

    expect(response.status).toBe(201);
    expect(response.body.publication).toMatchObject({
      businessId,
      acknowledgements: []
    });

    publicationId = response.body.publication.id;
  });

  it("blocks staff from publishing a roster week", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/rosters/publish`)
      .set("authorization", `Bearer ${staffToken}`)
      .send({
        weekStart
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "MANAGER_ROLE_REQUIRED"
    });
  });

  it("allows business members to read the publication status", async () => {
    const response = await request(app)
      .get(`/businesses/${businessId}/rosters/publication`)
      .query({
        weekStart
      })
      .set("authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.publication).toMatchObject({
      id: publicationId,
      businessId
    });
  });

  it("allows staff to acknowledge a published roster", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/rosters/${publicationId}/acknowledge`)
      .set("authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.acknowledgement).toMatchObject({
      publicationId,
      member: {
        displayName: "Roster Staff"
      }
    });
  });

  it("blocks non-members from acknowledging a roster", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/rosters/${publicationId}/acknowledge`)
      .set("authorization", `Bearer ${outsiderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "MEMBERSHIP_REQUIRED"
    });
  });

  it("clears acknowledgements when a roster week is republished", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/rosters/publish`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        weekStart
      });

    expect(response.status).toBe(201);
    expect(response.body.publication).toMatchObject({
      id: publicationId,
      acknowledgements: []
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
