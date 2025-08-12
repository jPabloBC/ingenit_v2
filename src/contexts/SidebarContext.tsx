"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
    isCollapsed: boolean;
    toggleCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        // Cargar estado inicial desde localStorage
        const savedCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
        setIsCollapsed(savedCollapsed);
    }, []);

    const toggleCollapse = () => {
        const newCollapsed = !isCollapsed;
        setIsCollapsed(newCollapsed);
        localStorage.setItem("sidebarCollapsed", newCollapsed.toString());
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleCollapse }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
} 