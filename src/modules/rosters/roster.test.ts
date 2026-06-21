import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db/prisma.js";
import {
  resetRosterEmailSenderForTest,
  setRosterEmailSenderForTest
} from "./roster-email.service.js";

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
let staffMemberId: string;
let publicationId: string;
const sentEmails: Array<{
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}> = [];

describe("roster publications", () => {
  beforeAll(async () => {
    setRosterEmailSenderForTest(async (email) => {
      sentEmails.push(email);
    });

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

    const memberResponse = await request(app)
      .post(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        email: staffEmail,
        displayName: "Roster Staff"
      });

    staffMemberId = memberResponse.body.member.id;

    await request(app)
      .post(`/businesses/${businessId}/shifts`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        memberId: staffMemberId,
        startsAt: "2026-06-16T09:00:00.000Z",
        endsAt: "2026-06-16T17:00:00.000Z",
        roleName: "Floor",
        notes: "Bring keys"
      });

    await request(app)
      .post(`/businesses/${businessId}/shifts`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        memberId: staffMemberId,
        startsAt: "2026-06-23T09:00:00.000Z",
        endsAt: "2026-06-23T17:00:00.000Z",
        roleName: "Floor"
      });
  }, 30_000);

  beforeEach(() => {
    sentEmails.length = 0;
  });

  afterAll(async () => {
    resetRosterEmailSenderForTest();

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
  }, 30_000);

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

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]).toMatchObject({
      to: staffEmail,
      subject: `Roster Publish Test ${testRunId} roster published for 15 June 2026`
    });
    expect(sentEmails[0]?.text).toContain("Roster Staff");
    expect(sentEmails[0]?.text).toContain("Floor");
    expect(sentEmails[0]?.text).toContain("Bring keys");
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

  it("lists roster records for published and draft weeks", async () => {
    const response = await request(app)
      .get(`/businesses/${businessId}/rosters`)
      .set("authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          weekStart: "2026-06-15",
          status: "published",
          shiftCount: 1,
          staffCount: 1,
          acknowledgementCount: 0
        }),
        expect.objectContaining({
          weekStart: "2026-06-22",
          status: "draft",
          shiftCount: 1,
          staffCount: 1,
          acknowledgementCount: 0,
          publishedAt: null
        })
      ])
    );
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
    expect(sentEmails).toHaveLength(1);
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
