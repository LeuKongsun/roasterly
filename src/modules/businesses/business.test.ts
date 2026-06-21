import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../db/prisma.js";

const app = createApp();
const testRunId = Date.now();
const managerEmail = `business-manager-${testRunId}@example.com`;
const staffEmail = `business-staff-${testRunId}@example.com`;
const outsiderEmail = `business-outsider-${testRunId}@example.com`;
const password = "correct-password";
const businessName = `Business Test ${testRunId}`;

let managerToken: string;
let staffToken: string;
let outsiderToken: string;
let businessId: string;

describe("businesses", () => {
  beforeAll(async () => {
    managerToken = await registerAndGetAccessToken(managerEmail);
    staffToken = await registerAndGetAccessToken(staffEmail);
    outsiderToken = await registerAndGetAccessToken(outsiderEmail);
  });

  afterAll(async () => {
    await prisma.business.deleteMany({
      where: {
        name: {
          startsWith: "Business Test"
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

  it("rejects unauthenticated business creation", async () => {
    const response = await request(app).post("/businesses").send({
      name: businessName
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({
      code: "MISSING_TOKEN"
    });
  });

  it("creates a business and makes the creator a manager", async () => {
    const response = await request(app)
      .post("/businesses")
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        name: businessName
      });

    expect(response.status).toBe(201);
    expect(response.body.business).toMatchObject({
      name: businessName
    });

    businessId = response.body.business.id;

    const members = await prisma.businessMember.findMany({
      where: {
        businessId
      }
    });

    expect(members).toHaveLength(1);
    expect(members[0]?.role).toBe("manager");

    await request(app)
      .post(`/businesses/${businessId}/members`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        email: staffEmail
      })
      .expect(201);
  });

  it("blocks staff-only users from creating a business", async () => {
    const response = await request(app)
      .post("/businesses")
      .set("authorization", `Bearer ${staffToken}`)
      .send({
        name: `${businessName} Staff Created`
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "MANAGER_ROLE_REQUIRED"
    });
  });

  it("blocks existing managers from creating another business", async () => {
    const response = await request(app)
      .post("/businesses")
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        name: `${businessName} Manager Created`
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "MANAGER_ROLE_REQUIRED"
    });
  });

  it("lists only businesses the user belongs to", async () => {
    const managerResponse = await request(app)
      .get("/businesses")
      .set("authorization", `Bearer ${managerToken}`);

    expect(managerResponse.status).toBe(200);
    expect(managerResponse.body.businesses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: businessId,
          name: businessName
        })
      ])
    );

    const outsiderResponse = await request(app)
      .get("/businesses")
      .set("authorization", `Bearer ${outsiderToken}`);

    expect(outsiderResponse.status).toBe(200);
    expect(outsiderResponse.body.businesses).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: businessId
        })
      ])
    );
  });

  it("lists only managed businesses for users with mixed staff and manager memberships", async () => {
    const staffOnlyBusiness = await prisma.business.create({
      data: {
        name: `${businessName} Staff Only`,
        members: {
          create: {
            user: {
              connect: {
                email: managerEmail
              }
            },
            role: "staff",
            displayName: managerEmail
          }
        }
      },
      select: {
        id: true
      }
    });

    const response = await request(app)
      .get("/businesses")
      .set("authorization", `Bearer ${managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.businesses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: businessId
        })
      ])
    );
    expect(response.body.businesses).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: staffOnlyBusiness.id
        })
      ])
    );
  });

  it("blocks non-members from reading business details", async () => {
    const response = await request(app)
      .get(`/businesses/${businessId}`)
      .set("authorization", `Bearer ${outsiderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "MEMBERSHIP_REQUIRED"
    });
  });

  it("allows a manager to rename a business", async () => {
    const response = await request(app)
      .patch(`/businesses/${businessId}`)
      .set("authorization", `Bearer ${managerToken}`)
      .send({
        name: `${businessName} Renamed`
      });

    expect(response.status).toBe(200);
    expect(response.body.business).toMatchObject({
      id: businessId,
      name: `${businessName} Renamed`
    });
  });

  it("blocks non-members from renaming a business", async () => {
    const response = await request(app)
      .patch(`/businesses/${businessId}`)
      .set("authorization", `Bearer ${outsiderToken}`)
      .send({
        name: "Outsider Rename"
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "MEMBERSHIP_REQUIRED"
    });
  });

  it("allows a manager to delete a business", async () => {
    const deleteBusiness = await prisma.business.create({
      data: {
        name: `${businessName} Delete Me`,
        members: {
          create: {
            user: {
              connect: {
                email: managerEmail
              }
            },
            role: "manager",
            displayName: managerEmail
          }
        }
      },
      select: {
        id: true
      }
    });

    const deleteResponse = await request(app)
      .delete(`/businesses/${deleteBusiness.id}`)
      .set("authorization", `Bearer ${managerToken}`);

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app)
      .get(`/businesses/${deleteBusiness.id}`)
      .set("authorization", `Bearer ${managerToken}`);

    expect(getResponse.status).toBe(404);
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
