import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate-request.js";
import { addMemberSchema, updateMemberSchema } from "./member.schemas.js";
import { addMember, deleteMember, listMembers, updateMember } from "./member.service.js";

export const memberRouter = Router({
  mergeParams: true
});

memberRouter.use(authenticate);

memberRouter.post("/", validateBody(addMemberSchema), async (req, res, next) => {
  try {
    const member = await addMember(currentUserId(res), routeParam(req.params, "businessId"), req.body);

    res.status(201).json({
      member
    });
  } catch (error) {
    next(error);
  }
});

memberRouter.get("/", async (req, res, next) => {
  try {
    const members = await listMembers(currentUserId(res), routeParam(req.params, "businessId"));

    res.status(200).json({
      members
    });
  } catch (error) {
    next(error);
  }
});

memberRouter.patch("/:memberId", validateBody(updateMemberSchema), async (req, res, next) => {
  try {
    const member = await updateMember(
      currentUserId(res),
      routeParam(req.params, "businessId"),
      routeParam(req.params, "memberId"),
      req.body
    );

    res.status(200).json({
      member
    });
  } catch (error) {
    next(error);
  }
});

memberRouter.delete("/:memberId", async (req, res, next) => {
  try {
    await deleteMember(
      currentUserId(res),
      routeParam(req.params, "businessId"),
      routeParam(req.params, "memberId")
    );

    res.status(204).send();
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
