import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody, validateQuery } from "../../middleware/validate-request.js";
import {
  createShiftSchema,
  myShiftsQuerySchema,
  type MyShiftsQuery,
  updateShiftSchema,
  type WeeklyRosterQuery,
  weeklyRosterQuerySchema
} from "./shift.schemas.js";
import {
  createShift,
  deleteShift,
  listMyShifts,
  listWeeklyRoster,
  updateShift
} from "./shift.service.js";

export const shiftRouter = Router({
  mergeParams: true
});

export const myShiftsRouter = Router();

shiftRouter.use(authenticate);
myShiftsRouter.use(authenticate);

shiftRouter.post("/", validateBody(createShiftSchema), async (req, res, next) => {
  try {
    const shift = await createShift(currentUserId(res), routeParam(req.params, "businessId"), req.body);

    res.status(201).json({
      shift
    });
  } catch (error) {
    next(error);
  }
});

shiftRouter.get("/", validateQuery(weeklyRosterQuerySchema), async (req, res, next) => {
  try {
    const shifts = await listWeeklyRoster(
      currentUserId(res),
      routeParam(req.params, "businessId"),
      req.query as WeeklyRosterQuery
    );

    res.status(200).json({
      shifts
    });
  } catch (error) {
    next(error);
  }
});

shiftRouter.patch("/:shiftId", validateBody(updateShiftSchema), async (req, res, next) => {
  try {
    const shift = await updateShift(
      currentUserId(res),
      routeParam(req.params, "businessId"),
      routeParam(req.params, "shiftId"),
      req.body
    );

    res.status(200).json({
      shift
    });
  } catch (error) {
    next(error);
  }
});

shiftRouter.delete("/:shiftId", async (req, res, next) => {
  try {
    await deleteShift(
      currentUserId(res),
      routeParam(req.params, "businessId"),
      routeParam(req.params, "shiftId")
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

myShiftsRouter.get("/", validateQuery(myShiftsQuerySchema), async (req, res, next) => {
  try {
    const shifts = await listMyShifts(currentUserId(res), req.query as MyShiftsQuery);

    res.status(200).json({
      shifts
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
