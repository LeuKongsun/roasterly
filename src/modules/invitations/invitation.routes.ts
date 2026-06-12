import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate-request.js";
import { acceptInvitationSchema, createInvitationSchema } from "./invitation.schemas.js";
import { acceptInvitation, createInvitation, listInvitations } from "./invitation.service.js";

export const businessInvitationRouter = Router({
  mergeParams: true
});

export const invitationRouter = Router();

businessInvitationRouter.use(authenticate);
invitationRouter.use(authenticate);

businessInvitationRouter.post("/", validateBody(createInvitationSchema), async (req, res, next) => {
  try {
    const result = await createInvitation(
      currentUserId(res),
      routeParam(req.params, "businessId"),
      req.body
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

businessInvitationRouter.get("/", async (req, res, next) => {
  try {
    const invitations = await listInvitations(currentUserId(res), routeParam(req.params, "businessId"));

    res.status(200).json({
      invitations
    });
  } catch (error) {
    next(error);
  }
});

invitationRouter.post("/accept", validateBody(acceptInvitationSchema), async (req, res, next) => {
  try {
    const member = await acceptInvitation(currentUserId(res), req.body);

    res.status(200).json({
      member
    });
  } catch (error) {
    next(error);
  }
});

function currentUserId(res: { locals: { auth?: { userId: string } } }) {
  return res.locals.auth?.userId ?? "";
}

function routeParam(params: unknown, key: string) {
  if (!params || typeof params !== "object") {
    return "";
  }

  const value = (params as Record<string, unknown>)[key];

  return typeof value === "string" ? value : "";
}
