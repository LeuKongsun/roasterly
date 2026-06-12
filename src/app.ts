import cors from "cors";
import express from "express";
import helmet from "helmet";
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

  app.use(helmet());
  app.use(requestLogger);
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json());

  app.use("/auth", authRouter);
  app.use("/businesses/:businessId/invitations", businessInvitationRouter);
  app.use("/businesses/:businessId/members", memberRouter);
  app.use("/businesses/:businessId/rosters", rosterRouter);
  app.use("/businesses/:businessId/shifts", shiftRouter);
  app.use("/businesses", businessRouter);
  app.use("/invitations", invitationRouter);
  app.use("/me/shifts", myShiftsRouter);
  app.use("/health", healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
