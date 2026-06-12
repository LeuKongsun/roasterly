import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody, validateQuery } from "../../middleware/validate-request.js";
import { acknowledgeRoster, getRosterPublication, publishRoster } from "./roster.service.js";
import { publishRosterSchema, rosterWeekQuerySchema, type RosterWeekQuery } from "./roster.schemas.js";

export const rosterRouter = Router({
  mergeParams: true
});

rosterRouter.use(authenticate);

rosterRouter.post("/publish", validateBody(publishRosterSchema), async (req, res, next) => {
  try {
    const publication = await publishRoster(
      currentUserId(res),
      routeParam(req.params, "businessId"),
      req.body
    );

    res.status(201).json({
      publication
    });
  } catch (error) {
    next(error);
  }
});

rosterRouter.get("/publication", validateQuery(rosterWeekQuerySchema), async (req, res, next) => {
  try {
    const publication = await getRosterPublication(
      currentUserId(res),
      routeParam(req.params, "businessId"),
      req.query as RosterWeekQuery
    );

    res.status(200).json({
      publication
    });
  } catch (error) {
    next(error);
  }
});

rosterRouter.post("/:publicationId/acknowledge", async (req, res, next) => {
  try {
    const acknowledgement = await acknowledgeRoster(
      currentUserId(res),
      routeParam(req.params, "businessId"),
      routeParam(req.params, "publicationId")
    );

    res.status(200).json({
      acknowledgement
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
