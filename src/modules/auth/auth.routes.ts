import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authRateLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate-request.js";
import { loginSchema, refreshTokenSchema, registerSchema } from "./auth.schemas.js";
import { getCurrentUser, login, logout, refresh, register } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await register(req.body, requestAuthContext(req));

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", authRateLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await login(req.body, requestAuthContext(req));

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", authRateLimiter, validateBody(refreshTokenSchema), async (req, res, next) => {
  try {
    const result = await refresh(req.body, requestAuthContext(req));

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", validateBody(refreshTokenSchema), async (req, res, next) => {
  try {
    await logout(req.body);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", authenticate, async (_req, res, next) => {
  try {
    const auth = res.locals.auth as { userId: string };
    const user = await getCurrentUser(auth.userId);

    res.status(200).json({
      user
    });
  } catch (error) {
    next(error);
  }
});

function requestAuthContext(req: { get(name: string): string | undefined; ip?: string }) {
  return {
    userAgent: req.get("user-agent"),
    ipAddress: req.ip
  };
}
