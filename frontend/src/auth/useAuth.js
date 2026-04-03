import { useEffect, useState } from "react";
import { COGNITO_CONFIG } from "./config";

export const useAuth = () => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");

      if (storedToken) {
        try {
          const payload = JSON.parse(atob(storedToken.split(".")[1]));
          const isExpired = payload.exp * 1000 < Date.now();
          if (isExpired) {
            localStorage.removeItem("token");
          } else {
            setToken(storedToken);
            setLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem("token");
        }
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        try {
          await exchangeCodeForToken(code);
        } catch (e) {
          console.error("Token exchange failed", e);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const exchangeCodeForToken = async (code) => {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: COGNITO_CONFIG.clientId,
      code,
      redirect_uri: COGNITO_CONFIG.redirectUri
    });

    const res = await fetch(`${COGNITO_CONFIG.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const data = await res.json();

    if (!data.id_token) {
      throw new Error("No token received");
    }

    localStorage.setItem("token", data.id_token);
    setToken(data.id_token);

    window.history.replaceState({}, document.title, "/");
  };

  const login = () => {
    const url = `${COGNITO_CONFIG.domain}/login?client_id=${COGNITO_CONFIG.clientId}&response_type=code&scope=email+openid+profile&redirect_uri=${COGNITO_CONFIG.redirectUri}`;
    window.location.href = url;
  };

  const logout = () => {
    localStorage.removeItem("token");
    const logoutUrl = `${COGNITO_CONFIG.domain}/logout?client_id=${COGNITO_CONFIG.clientId}&logout_uri=${COGNITO_CONFIG.redirectUri}`;
    window.location.href = logoutUrl;
  };

  return { token, loading, login, logout };
};