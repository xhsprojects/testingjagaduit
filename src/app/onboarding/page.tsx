"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import OnboardingClientPage from './client';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage({ onSetupComplete }: { onSetupComplete?: () => void }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    if (loading) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-lg font-semibold">Memuat...</p>
            </div>
        );
    }
    
    // This page is for new users, if a user is logged out, send to login.
    if (!user) {
        router.replace('/login');
        return null;
    }
    
    // onSetupComplete is passed from ClientPage when this is used as a component
    // If it's a standalone page, it will redirect.
    const handleComplete = onSetupComplete || (() => router.replace('/'));

    return <OnboardingClientPage onSetupComplete={handleComplete} />;
}
