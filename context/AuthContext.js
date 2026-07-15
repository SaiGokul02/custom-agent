"use client";

import { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // { userId, username, jwt }
    const [userId, setUserId] = useState();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        verifyUser();
    }, []);

    const verifyUser = async () => {
        const jwt = Cookies.get("jwt");
        const userId = Cookies.get("userId");
        const username = Cookies.get("username");

        if (!jwt) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jwt }),
            });

            if (!response.ok) throw new Error("Invalid token");

            setUser({ userId, username, jwt });
        } catch (err) {
            // token expired/invalid, clear stale cookies
            Cookies.remove("userId");
            Cookies.remove("username");
            Cookies.remove("jwt");
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = ({ userId, username, jwt }) => {
        Cookies.set("userId", userId, { expires: 7 });
        Cookies.set("username", username, { expires: 7 });
        Cookies.set("jwt", jwt, { expires: 7 });
        setUser({ userId, username, jwt });
    };

    const logout = () => {
        Cookies.remove("userId");
        Cookies.remove("username");
        Cookies.remove("jwt");
        setUser(null);
    };

    useEffect(() => {
        setUserId(user?.userId);
    }, [user]);

    return (
        <AuthContext.Provider value={{ userId, user, isLoading, login, logout, verifyUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}