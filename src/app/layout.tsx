import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Prompt Chain Studio", description: "Superadmin prompt chain orchestration" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en" suppressHydrationWarning><body>{children}</body></html>; }
