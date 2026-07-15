"use client";

import styles from "./Login.module.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
    const router = useRouter();
    const { user, isLoading: authLoading, login } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [nameError, setNameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    // const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // const validateEmail = (email) => {
    //     return emailRegex.test(email);
    // }

    // If already logged in (valid cookie verified on load), skip the form
    useEffect(() => {
        if (!authLoading && user) {
            router.push("/");
        }
    }, [authLoading, user, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const body = isLogin
            ? { email, password }
            : { username: name, email, password };

        try {
            setError("");
            setEmailError("");
            setPasswordError("");
            if (!isLogin) setNameError("");
            setIsLoading(true);

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Something went wrong");
            }

            const data = await response.json();
            const { userId, jwt, username } = data.user;

            login({ userId, username, jwt }); // sets cookies + context in one call

            setName("");
            setEmail("");
            setPassword("");

            router.push("/"); // redirect on success
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNameChange = (e) => {
        setError("")
        setNameError("");
        setName(e.target.value);
    }

    const handleEmailChange = (e) => {
        setError("")
        setNameError("");
        setEmail(e.target.value);
    }

    const handlePasswordChange = (e) => {
        setError("")
        setNameError("");
        setPassword(e.target.value);
    }

    // const handleSubmit = async (e) => {
    //     e.preventDefault();

    //     if (isLogin) {
    //         try {
    //             setError("");
    //             setEmailError("");
    //             setPasswordError("");

    //             if (!email.trim()) {
    //                 setEmailError("Email is required");
    //             } else if (!validateEmail(email)) {
    //                 setEmailError("Please enter a valid email address");
    //             }

    //             if (!password.trim()) {
    //                 setPasswordError("Password is required");
    //             }

    //             setIsLoading(true);

    //             // Login API
    //             const response = await fetch('/api/auth/login', {
    //                 method: 'POST',
    //                 headers: {
    //                     "Content-Type": "application/json"
    //                 },
    //                 body: JSON.stringify({
    //                     email,
    //                     password
    //                 })
    //             });

    //             if (!response.ok) {
    //                 const errorData = await response.json();

    //                 throw new Error(errorData.error || "Failed to log in");
    //             }

    //             const data = await response.json();

    //             const { userId, jwt, username } = data.user;

    //             Cookies.set('userId', userId, { expires: 7 });
    //             Cookies.set('username', username, { expires: 7 });
    //             Cookies.set('jwt', jwt, { expires: 7 });

    //             setEmail("");
    //             setPassword("");
    //         } catch (error) {
    //             setError(error.message);
    //         } finally {
    //             setIsLoading(false);

    //         }


    //     } else {
    //         // Signup API
    //         try {
    //             setError("");
    //             setEmailError("");
    //             setPasswordError("");

    //             if (!email.trim()) {
    //                 setEmailError("Email is required");
    //             } else if (!validateEmail(email)) {
    //                 setEmailError("Please enter a valid email address");
    //             }

    //             if (!password.trim()) {
    //                 setPasswordError("Password is required");
    //             }

    //             if (!name.trim()) {
    //                 setNameError("Name is required");
    //             }

    //             setIsLoading(true);

    //             const response = await fetch('/api/auth/register', {
    //                 method: 'POST',
    //                 headers: {
    //                     'Content-Type': 'application/json'
    //                 },
    //                 body: JSON.stringify({ username: name, email, password })
    //             });

    //             if (!response.ok) {
    //                 const errorData = await response.json();

    //                 throw new Error(errorData.error || "Failed to sign up");
    //             }

    //             const data = await response.json();

    //             const { userId, username, jwt } = data.user;

    //             Cookies.set('userId', userId, { expires: 7 });
    //             Cookies.set('username', username, { expires: 7 });
    //             Cookies.set('jwt', jwt, { expires: 7 });


    //             setName("");
    //             setEmail("");
    //             setPassword("");
    //         } catch (error) {
    //             setError(error.message);
    //         } finally {
    //             setIsLoading(false);
    //         }

    //     }
    // };

    return (
        <div className={styles.loginForm}>
            <form className={styles.formSec} onSubmit={handleSubmit}>

                <h2 className={styles.formTitle}>
                    {isLogin ? "Welcome Back" : "Create Account"}
                </h2>

                <p className={styles.formSubtitle}>
                    {isLogin
                        ? "Login to continue."
                        : "Create your account to get started."}
                </p>

                {!isLogin && (
                    <div className={styles.field}>
                        <label>Name</label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => handleNameChange(e)}
                        />
                        {nameError && <p style={{ color: 'red', fontSize: '14px' }}>{nameError}</p>}
                    </div>
                )}

                <div className={styles.field}>
                    <label>Email</label>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => handleEmailChange(e)}
                    />
                    {emailError && <p style={{ color: 'red', fontSize: '14px' }}>{emailError}</p>}
                </div>

                <div className={styles.field}>
                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => handlePasswordChange(e)}
                    />
                    {passwordError && <p style={{ color: 'red', fontSize: '14px' }}>{passwordError}</p>}
                </div>

                <button
                    type="submit"
                    className={styles.submitBtn}
                >
                    {isLogin ? (isLoading ? "Loging in..." : "Login") : (isLoading ? "Signing in..." : "Sign Up")}
                </button>

                <p className={styles.switchText}>
                    {isLogin
                        ? "Don't have an account?"
                        : "Already have an account?"}

                    <button
                        type="button"
                        className={styles.switchBtn}
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? "Sign Up" : "Login"}
                    </button>
                </p>
                {error && <p style={{
                    color: 'red'
                }}>{error}</p>}
            </form>
        </div>
    );
}