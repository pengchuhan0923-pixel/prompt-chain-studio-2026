import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAuthorizedSuperadminEmail } from "@/lib/authorized-superadmins";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error_description");
  if (oauthError) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(oauthError)}`, url.origin));

  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user && isAuthorizedSuperadminEmail(user.email)) {
    await supabase
      .from("profiles")
      .update({ is_superadmin: true })
      .eq("id", user.id);
  }

  return NextResponse.redirect(new URL(user ? "/studio" : "/login?error=Sign-in%20did%20not%20complete", url.origin));
}
