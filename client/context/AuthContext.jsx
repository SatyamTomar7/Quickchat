import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";
import api from "../src/lib/api";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  const connectSocket = useCallback((userData, authToken = localStorage.getItem("token")) => {
    if (!userData || socket?.connected) return;
    const newSocket = io(import.meta.env.VITE_BACKEND_URL, {
      auth: {
        token: authToken,
      },
    });
    setSocket(newSocket);
    newSocket.on("getOnlineUsers", (userIds) => {
      setOnlineUsers(userIds);
    });
  }, [socket]);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/api/auth/check");
      if (data.success) {
        setAuthUser(data.user);
        connectSocket(data.user);
      }
    } catch (error) {
      if (error.response?.status !== 401) toast.error(error.response?.data?.message || "Unable to verify session");
    }
  }, [connectSocket]);

  const login = async (state, credentials) => {
    try {
      const { data } = await api.post(`/api/auth/${state}`, credentials);
      if (data.success) {
        setAuthUser(data.userData);
        localStorage.setItem("token", data.token);
        setToken(data.token);
        connectSocket(data.userData, data.token);
        toast.success(data.message);
      } else {
        toast.error(data.message || "Unable to authenticate");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to authenticate");
    }
  };
  const logout = async () => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    toast.success("Logged out successfully");
    socket?.disconnect();
    setSocket(null);
  };
  const updateProfile = async (body) => {
    try {
      const { data } = await api.put("/api/auth/update-profile", body);
      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update profile");
    }
  };

  useEffect(() => {
    if (!token) return;
    queueMicrotask(() => void checkAuth());
  }, [checkAuth, token]);

  const value = { axios: api, authUser, onlineUsers, socket, login, logout, updateProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
