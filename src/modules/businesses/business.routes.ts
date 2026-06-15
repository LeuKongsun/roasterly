import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate-request.js";
import { createBusinessSchema, updateBusinessSchema } from "./business.schemas.js";
import {
  createBusiness,
  deleteBusiness,
  getBusiness,
  listBusinesses,
  updateBusiness
} from "./business.service.js";

export const businessRouter = Router();

businessRouter.use(authenticate);

businessRouter.post("/", validateBody(createBusinessSchema), async (req, res, next) => {
  try {
    const business = await createBusiness(currentUserId(res), req.body);

    res.status(201).json({
      business
    });
  } catch (error) {
    next(error);
  }
});

businessRouter.get("/", async (_req, res, next) => {
  try {
    const businesses = await listBusinesses(currentUserId(res));

    res.status(200).json({
      businesses
    });
  } catch (error) {
    next(error);
  }
});

businessRouter.get("/:businessId", async (req, res, next) => {
  try {
    const business = await getBusiness(currentUserId(res), routeParam(req.params, "businessId"));

    res.status(200).json({
      business
    });
  } catch (error) {
    next(error);
  }
});

businessRouter.patch("/:businessId", validateBody(updateBusinessSchema), async (req, res, next) => {
  try {
    const business = await updateBusiness(currentUserId(res), routeParam(req.params, "businessId"), req.body);

    res.status(200).json({
      business
    });
  } catch (error) {
    next(error);
  }
});

businessRouter.delete("/:businessId", async (req, res, next) => {
  try {
    await deleteBusiness(currentUserId(res), routeParam(req.params, "businessId"));

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
