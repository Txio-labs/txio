'use client';

import React from 'react';
import { GetStartedPage as GetStartedPageContent } from "@/features/GetStartedPage";
import { DesktopSignIn } from "@/features/DesktopSignIn";
import { useIsDesktopApp } from "@/lib/desktop";

export default function SignUpPage() {
    // Txio Desktop creates accounts on the website, in the system browser.
    const desktop = useIsDesktopApp();
    if (desktop === null) return null;
    return desktop ? <DesktopSignIn /> : <GetStartedPageContent />;
}
