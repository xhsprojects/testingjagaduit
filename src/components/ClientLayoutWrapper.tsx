
"use client";

import { AuthProvider } from "@/context/AuthContext";
import React from "react";
import { ThemeProvider } from "./ThemeProvider";
import AppContent from "./AppContent";

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
