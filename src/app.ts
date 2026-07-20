import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { requestLogger } from "./middleware/request-logger.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { businessRouter } from "./modules/businesses/business.routes.js";
import { businessInvitationRouter, invitationRouter } from "./modules/invitations/invitation.routes.js";
import { memberRouter } from "./modules/members/member.routes.js";
import { rosterRouter } from "./modules/rosters/roster.routes.js";
import { myShiftsRouter, shiftRouter } from "./modules/shifts/shift.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false,
  }));
  app.use(requestLogger);
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json());

  // Route /api and direct endpoints
  app.use(["/api/auth", "/auth"], authRouter);
  app.use(["/api/businesses/:businessId/invitations", "/businesses/:businessId/invitations"], businessInvitationRouter);
  app.use(["/api/businesses/:businessId/members", "/businesses/:businessId/members"], memberRouter);
  app.use(["/api/businesses/:businessId/rosters", "/businesses/:businessId/rosters"], rosterRouter);
  app.use(["/api/businesses/:businessId/shifts", "/businesses/:businessId/shifts"], shiftRouter);
  app.use(["/api/businesses", "/businesses"], businessRouter);
  app.use(["/api/invitations", "/invitations"], invitationRouter);
  app.use(["/api/me/shifts", "/me/shifts"], myShiftsRouter);
  app.use(["/api/health", "/health"], healthRouter);

  // Serve static web frontend in production or if web/dist exists
  const webDistPath = path.resolve(process.cwd(), "web/dist");
  app.use(express.static(webDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/auth") || req.path.startsWith("/businesses") || req.path.startsWith("/invitations") || req.path.startsWith("/me") || req.path.startsWith("/health")) {
      return next();
    }
    res.sendFile(path.join(webDistPath, "index.html"), (err) => {
      if (err) next(err);
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
