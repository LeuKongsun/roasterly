import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db/prisma.js";

const app = createApp();
const testRunId = Date.now();
const managerEmail = `shift-manager-${testRunId}@example.com`;
const staffEmail = `shift-staff-${testRunId}@example.com`;
const outsiderEmail = `shift-outsider-${testRunId}@example.com`;
const password = "correct-password";
const businessName = `Shift Test ${testRunId}`;

let managerToken: string;
let staffToken: string;
let outsiderToken: string;
let businessId: string;
let staffMemberId: string;
let managerMemberId: string;
let shiftId: string;
let managerShiftId: string;

describe("shifts", () => {
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

    const membersResponse = await request(app)
      .get(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${managerToken}`);

    managerMemberId = membersResponse.body.members[0].id;

    const memberResponse = await request(app)
      .post(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        email: staffEmail,
        displayName: "Shift Staff"
      });

    staffMemberId = memberResponse.body.member.id;
  });

  afterAll(async () => {
    await prisma.business.deleteMany({
      where: {
        name: {
          startsWith: "Shift Test"
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

  it("allows a manager to create a shift", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/shifts`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        memberId: staffMemberId,
        startsAt: "2026-06-15T09:00:00.000Z",
        endsAt: "2026-06-15T17:00:00.000Z",
        roleName: "Front counter",
        notes: "Opening shift"
      });

    expect(response.status).toBe(201);
    expect(response.body.shift).toMatchObject({
      memberId: staffMemberId,
      roleName: "Front counter",
      member: {
        displayName: "Shift Staff"
      }
    });

    shiftId = response.body.shift.id;

    const managerShiftResponse = await request(app)
      .post(`/businesses/${businessId}/shifts`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        memberId: managerMemberId,
        startsAt: "2026-06-16T09:00:00.000Z",
        endsAt: "2026-06-16T17:00:00.000Z",
        roleName: "Manager cover"
      });

    expect(managerShiftResponse.status).toBe(201);
    managerShiftId = managerShiftResponse.body.shift.id;
  });

  it("rejects shifts where the end time is before the start time", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/shifts`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        memberId: staffMemberId,
        startsAt: "2026-06-15T17:00:00.000Z",
        endsAt: "2026-06-15T09:00:00.000Z"
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "INVALID_SHIFT_TIME"
    });
  });

  it("blocks staff from creating shifts", async () => {
    const response = await request(app)
      .post(`/businesses/${businessId}/shifts`)
      .set("authorization", `Bearer ${staffToken}`)
      .send({
        memberId: staffMemberId,
        startsAt: "2026-06-16T09:00:00.000Z",
        endsAt: "2026-06-16T17:00:00.000Z"
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "MANAGER_ROLE_REQUIRED"
    });
  });

  it("allows staff to view only their assigned weekly roster shifts", async () => {
    const response = await request(app)
      .get(`/businesses/${businessId}/shifts`)
      .query({
        weekStart: "2026-06-15"
      })
      .set("authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.shifts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: shiftId,
          memberId: staffMemberId
        })
      ])
    );
    expect(response.body.shifts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: managerShiftId,
          memberId: managerMemberId
        })
      ])
    );
  });

  it("includes Melbourne Monday morning shifts in the matching week", async () => {
    const createResponse = await request(app)
      .post(`/businesses/${businessId}/shifts`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        memberId: staffMemberId,
        startsAt: "2026-06-07T23:00:00.000Z",
        endsAt: "2026-06-08T07:00:00.000Z",
        roleName: "Melbourne open"
      });

    expect(createResponse.status).toBe(201);

    const rosterResponse = await request(app)
      .get(`/businesses/${businessId}/shifts`)
      .query({
        weekStart: "2026-06-08"
      })
      .set("authorization", `Bearer ${staffToken}`);

    expect(rosterResponse.status).toBe(200);
    expect(rosterResponse.body.shifts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.body.shift.id,
          roleName: "Melbourne open"
        })
      ])
    );
  });

  it("returns the current user's assigned shifts", async () => {
    const response = await request(app)
      .get("/me/shifts")
      .query({
        from: "2026-06-15",
        to: "2026-06-22"
      })
      .set("authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.shifts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: shiftId,
          business: expect.objectContaining({
            id: businessId,
            name: businessName
          })
        })
      ])
    );
  });

  it("blocks non-members from viewing a business roster", async () => {
    const response = await request(app)
      .get(`/businesses/${businessId}/shifts`)
      .query({
        weekStart: "2026-06-15"
      })
      .set("authorization", `Bearer ${outsiderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "MEMBERSHIP_REQUIRED"
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
