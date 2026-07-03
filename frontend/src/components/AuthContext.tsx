import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  ApiError,
  AuthResponse,
  User,
  apiRequest,
} from "../api/client";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const TOKEN_STORAGE_KEY = "quickrecon-token";
const AuthContext = createContext<AuthContextValue | null>(null);

async function authenticate(
  mode: "login" | "register",
  username: string,
  password: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(`/auth/${mode}`, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_STORAGE_KEY),
  );
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) {
      setReady(true);
      return;
    }

    apiRequest<User>("/auth/me", {}, token)
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setReady(true);
      });
  }, [token]);

  const value: AuthContextValue = {
    token,
    user,
    ready,
    async login(username: string, password: string) {
      const response = await authenticate("login", username, password);
      localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
      setToken(response.access_token);
      setUser(response.user);
    },
    async register(username: string, password: string) {
      const response = await authenticate("register", username, password);
      localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
      setToken(response.access_token);
      setUser(response.user);
    },
    logout() {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new ApiError("Auth context is unavailable.", 500);
  }
  return context;
}
