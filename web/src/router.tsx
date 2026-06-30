import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
  Outlet
} from "@tanstack/react-router";
import * as React from "react";
import { AuthScreen } from "./components/AuthScreen";
import { Workspace } from "./components/workspace/Workspace";
import { ShiftsSection } from "./components/roster/ShiftsSection";
import { StaffSection } from "./components/staff/StaffSection";
import { WorkspaceContext } from "./context/WorkspaceContext";

export interface AuthContext {
  accessToken: string;
  userEmail: string;
  authNotice: string;
  login: (token: string, email: string) => void;
  logout: (message?: string) => void;
  setAuthNotice: (notice: string) => void;
  theme: "system" | "light" | "dark";
  setTheme: (theme: "system" | "light" | "dark") => void;
}

export interface RouterContext {
  auth: AuthContext;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: ({ context }) => {
    if (context.auth.accessToken) {
      throw redirect({ to: "/shifts" });
    }
  },
  component: () => {
    const { auth } = rootRoute.useRouteContext();
    return (
      <AuthScreen
        notice={auth.authNotice}
        onAuth={auth.login}
        theme={auth.theme}
        onThemeChange={auth.setTheme}
      />
    );
  }
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  beforeLoad: ({ context }) => {
    if (!context.auth.accessToken) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => {
    const { auth } = rootRoute.useRouteContext();
    return (
      <Workspace
        accessToken={auth.accessToken}
        userEmail={auth.userEmail}
        onLogout={auth.logout}
        theme={auth.theme}
        onThemeChange={auth.setTheme}
      />
    );
  }
});


const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  loader: () => {
    throw redirect({ to: "/shifts" });
  }
});

const shiftsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/shifts",
  component: () => {
    const context = React.useContext(WorkspaceContext);
    if (!context) {
      throw new Error("WorkspaceContext not found");
    }
    const navigate = useNavigate();

    React.useEffect(() => {
      if (!context.canManage && !context.isLoading) {
        navigate({ to: `/shifts/${context.weekStart}`, replace: true });
      }
    }, [context.canManage, context.isLoading, context.weekStart, navigate]);

    if (!context.canManage) {
      return null;
    }

    return <ShiftsSection {...context} view="records" />;
  }
});

const shiftsBoardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/shifts/$weekStart",
  component: () => {
    const context = React.useContext(WorkspaceContext);
    if (!context) {
      throw new Error("WorkspaceContext not found");
    }
    return <ShiftsSection {...context} view="board" />;
  }
});

const staffRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/staff",
  component: () => {
    const context = React.useContext(WorkspaceContext);
    if (!context) {
      throw new Error("WorkspaceContext not found");
    }
    return <StaffSection {...context} />;
  }
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([
    indexRoute,
    shiftsRoute,
    shiftsBoardRoute,
    staffRoute
  ])
]);

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!
  }
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
