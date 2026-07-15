'use client';

import { useEffect, useState } from 'react';
import styles from './Toast.module.css';

export default function Toast({ toast, setToast }) {
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (!toast) return;

        setClosing(false);

        const close = setTimeout(() => {
            setClosing(true);
        }, 1500);

        const remove = setTimeout(() => {
            setToast(null);
        }, 2000);

        return () => {
            clearTimeout(close);
            clearTimeout(remove);
        };
    }, [toast, setToast]);

    if (!toast) return null;

    return (
        <div
            className={`${styles.toast}
                ${closing ? styles.closing : ""}
                ${toast.type === "success" ? styles.success : styles.error}`}
        >
            {toast.message}
        </div>
    );
}