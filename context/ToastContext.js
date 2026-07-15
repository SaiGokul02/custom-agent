'use client';

import { createContext, useContext, useState } from 'react';
import Toast from '@/components/Toast/Toast';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({
            id: Date.now(),
            message,
            type,
        });
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Toast toast={toast} setToast={setToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}