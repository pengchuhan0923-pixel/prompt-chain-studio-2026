"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [message, setMessage] = useState("");

  async function signIn() {
    setMessage("Opening Google sign-in…");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) setMessage(error.message);
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="card w-full max-w-md p-9 text-center">
        <span className="inline-grid h-14 w-14 place-items-center rounded-full bg-[var(--acid)] text-2xl font-black text-black">↗</span>
        <p className="mt-6 text-xs font-black uppercase tracking-[.25em] text-[var(--violet)]">Prompt Chain Studio</p>
        <h1 className="mt-3 text-4xl font-black">Admin sign in</h1>
        <p className="mt-4 leading-7 text-[var(--muted)]">
          Sign in through the existing Supabase Google provider. Access is granted only when your profile is marked as a superadmin.
        </p>
        <button onClick={signIn} className="mt-7 w-full bg-[var(--ink)] px-5 py-4 font-black text-[var(--paper)]">
          Continue with Google →
        </button>
        {message && <p className="mt-4 text-sm text-[var(--muted)]">{message}</p>}
      </section>
    </main>
  );
}
