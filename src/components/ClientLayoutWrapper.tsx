
"use client";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNavbar } from "./BottomNavbar";
import InstallPwaPrompt from "./InstallPwaPrompt";
import NotificationHandler from "./NotificationHandler";
import { ThemeProvider } from "./ThemeProvider";

// An explicit list of theme classes we manage.
const THEME_CLASSES = ['theme-default', 'theme-forest', 'theme-sunset', 'theme-ocean', 'theme-midnight', 'theme-sakura', 'theme-gold', 'theme-custom'];

const hexToHSL = (hex: string): string | null => {
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
        return null;
    }
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255; g /= 255; b /= 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
};

const getContrastColor = (hex: string): string => {
    if (hex.slice(0, 1) === '#') {
        hex = hex.slice(1);
    }
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 4), 16);
    const b = parseInt(hex.substr(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '224 71.4% 4.1%' : '0 0% 100%';
};

// This is the inner component that has access to the AuthContext
function AppContent({ children }: { children: React.ReactNode }) {
    const { theme, customThemeColor, isMaintenanceMode, isAdmin, loading, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!theme) return;
        
        const themeClass = `theme-${theme}`;
        
        THEME_CLASSES.forEach(t => {
            if (document.documentElement.classList.contains(t)) {
                document.documentElement.classList.remove(t);
            }
        });

        document.documentElement.classList.add(themeClass);
    }, [theme]);
    
    useEffect(() => {
        const styleElementId = 'custom-theme-style';
        let styleElement = document.getElementById(styleElementId);

        if (theme === 'custom' && customThemeColor) {
            const hslColor = hexToHSL(customThemeColor);
            if (!hslColor) return;
            const foregroundHsl = getContrastColor(customThemeColor);

            const styleContent = `
                .theme-custom {
                    --primary: ${hslColor};
                    --primary-foreground: ${foregroundHsl};
                    --ring: ${hslColor};
                }
            `;
            if (styleElement) {
                styleElement.innerHTML = styleContent;
            } else {
                const newStyleElement = document.createElement('style');
                newStyleElement.id = styleElementId;
                newStyleElement.innerHTML = styleContent;
                document.head.appendChild(newStyleElement);
            }
        } else {
            if (styleElement) {
                styleElement.remove();
            }
        }
    }, [theme, customThemeColor]);

    useEffect(() => {
        if (loading) return; 

        const isPublicPage = pathname === '/login' || pathname === '/maintenance';

        if (isMaintenanceMode && !isAdmin && !isPublicPage) {
            router.replace('/maintenance');
        }

    }, [isMaintenanceMode, isAdmin, loading, router, pathname]);


    const showNavbar = user && !loading && pathname !== '/login' && pathname !== '/maintenance';

    return (
        <>
            {children}
            {showNavbar && <BottomNavbar />}
            <InstallPwaPrompt />
            {user && <NotificationHandler />}
        </>
    );
}

// This is the main wrapper that provides all contexts
export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <AppContent>
              {children}
            </AppContent>
        </ThemeProvider>
    </AuthProvider>
  );
}
