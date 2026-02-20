// src/lib/firebase-server.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { Auth, getAuth } from 'firebase-admin/auth';

// Use a dynamic app name to avoid conflicts in serverless environments
const getAppName = () => `jaga-duit-admin--${process.env.VERCEL_DEPLOYMENT_ID || 'local'}`;

function initializeAdminApp(): App | null {
    const appName = getAppName();
    const existingApp = getApps().find(app => app.name === appName);
    if (existingApp) {
        return existingApp;
    }

    // Use server-side variable, but fall back to the public one if it exists.
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!privateKey || !clientEmail || !projectId) {
        console.error("CRITICAL: Firebase Admin SDK credentials missing from environment variables. Server-side features like XP and Admin tools will be disabled.");
        console.error("Please ensure FIREBASE_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are set.");
        return null;
    }
    
    try {
        const app = initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
        }, appName);
        return app;
    } catch (error: any) {
        console.error('Firebase Admin SDK Initialization Error:', error.message);
        return null;
    }
}

export function getDbAdmin(): Firestore | null {
    const app = initializeAdminApp();
    if (!app) return null;
    return getFirestore(app);
}

export function getAuthAdmin(): Auth | null {
    const app = initializeAdminApp();
    if (!app) return null;
    return getAuth(app);
}
