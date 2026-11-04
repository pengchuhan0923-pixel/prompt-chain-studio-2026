import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAuthorizedSuperadminEmail } from "@/lib/authorized-superadmins";

export async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: profile } = await supabase.from("profiles").select("id, first_name, last_name, is_superadmin").eq("id", user.id).single();

  // Promote only the two explicitly approved accounts. The existing profiles
  // RLS policy permits a signed-in user to update their own profile, and every
  // protected page/action still verifies the stored database flag afterward.
  if (!profile?.is_superadmin && isAuthorizedSuperadminEmail(user.email)) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_superadmin: true })
      .eq("id", user.id);

    if (!error) {
      const result = await supabase
        .from("profiles")
        .select("id, first_name, last_name, is_superadmin")
        .eq("id", user.id)
        .single();
      profile = result.data;
    }
  }

  if (!profile?.is_superadmin) redirect("/not-authorized");
  return { supabase, user, profile };
}
