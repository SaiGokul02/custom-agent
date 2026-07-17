"use client";
import styles from './Navbar.module.css';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
    const router = useRouter();
    const { user, isLoading, logout } = useAuth();

    const displayName = user?.username;

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    return (
        <ul className={styles.navbar}>
            <li><Link href={'/'}>Home</Link></li>
            <li><Link href={'/nutrition'}>Nutrition</Link></li>
            <li><Link href={'/settings'}>Settings</Link></li>

            {isLoading ? (
                <p>Loading...</p>
            ) : displayName ? (
                <div className={styles.profile}>
                    <p>Hi, {displayName}</p>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            ) : (
                <Link className={styles.login} href={"/login"}>Login</Link>
            )}
        </ul>
    );
}