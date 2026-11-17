'use client';

import React from 'react';
import { SignInPage as SignInPageContent } from "@/features/SignInPage";
import { DesktopSignIn } from "@/features/DesktopSignIn";
import { useIsDesktopApp } from "@/lib/desktop";

export default function SignInPage() {
    // Txio Desktop signs in through the website in the system browser.
    const desktop = useIsDesktopApp();
    if (desktop === null) return null;
    return desktop ? <DesktopSignIn /> : <SignInPageContent />;
}
