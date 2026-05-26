import type { RequestHandler } from "express";
import { HttpError } from "../errors/http-error.js";
import { verifyAccessToken } from "../modules/auth/token.service.js";

export const authenticate: RequestHandler = (req, res, next) => {
  const authorization = req.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    next(new HttpError(401, "Missing bearer token", "MISSING_TOKEN"));
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  const payload = verifyAccessToken(token);

  if (!payload) {
    next(new HttpError(401, "Invalid bearer token", "INVALID_TOKEN"));
    return;
  }

  res.locals.auth = {
    userId: payload.sub,
    email: payload.email
  };

  next();
};

