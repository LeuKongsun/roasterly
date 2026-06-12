import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate-request.js";
import { createBusinessSchema } from "./business.schemas.js";
import { createBusiness, getBusiness, listBusinesses } from "./business.service.js";

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
    const business = await getBusiness(currentUserId(res), req.params.businessId);

    res.status(200).json({
      business
    });
  } catch (error) {
    next(error);
  }
});

function currentUserId(res: { locals: { auth?: { userId: string } } }) {
  return res.locals.auth?.userId ?? "";
}
