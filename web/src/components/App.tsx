import { useState, useEffect } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "../router";

const tokenStorageKey = "rosterly.accessToken";
const emailStorageKey = "rosterly.email";

export function App() {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(tokenStorageKey) ?? "");
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem(emailStorageKey) ?? "");
  const [authNotice, setAuthNotice] = useState("");
  const [theme, setThemeState] = useState<"system" | "light" | "dark">(() => {
    return (localStorage.getItem("rosterly.theme") as "system" | "light" | "dark") ?? "system";
  });

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme(isDark: boolean) {
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }

    if (theme === "dark") {
      applyTheme(true);
    } else if (theme === "light") {
      applyTheme(false);
    } else {
      // system theme selection
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(media.matches);

      const listener = (event: MediaQueryListEvent) => {
        applyTheme(event.matches);
      };

      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }

    localStorage.setItem("rosterly.theme", theme);
  }, [theme]);

  useEffect(() => {
    router.invalidate();
  }, [accessToken]);

  function handleAuth(token: string, email: string) {
    localStorage.setItem(tokenStorageKey, token);
    localStorage.setItem(emailStorageKey, email);
    setAccessToken(token);
    setUserEmail(email);
    setAuthNotice("");
  }

  function logout(message = "") {
    localStorage.removeItem(tokenStorageKey);
    localStorage.removeItem(emailStorageKey);
    setAccessToken("");
    setUserEmail("");
    setAuthNotice(message);
  }

  return (
    <RouterProvider
      router={router}
      context={{
        auth: {
          accessToken,
          userEmail,
          authNotice,
          login: handleAuth,
          logout,
          setAuthNotice,
          theme,
          setTheme: setThemeState
        }
      }}
    />
  );
}

