"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";

const clean = (value: FormDataEntryValue | null, max = 4000) => String(value ?? "").trim().slice(0, max);
const id = (form: FormData, key: string) => clean(form.get(key), 100);
const refresh = () => revalidatePath("/studio");

export async function createChain(form: FormData) {
  const { supabase } = await requireSuperadmin();
  const name = clean(form.get("name"), 80);
  if (!name) throw new Error("Chain name is required.");
  const { error } = await supabase.from("prompt_chains").insert({ name, description: clean(form.get("description"), 240), is_active: true });
  if (error) throw new Error(error.message);
  refresh();
}

export async function updateChain(form: FormData) {
  const { supabase } = await requireSuperadmin();
  const { error } = await supabase.from("prompt_chains").update({ name: clean(form.get("name"), 80), description: clean(form.get("description"), 240) }).eq("id", id(form, "chain_id"));
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteChain(form: FormData) {
  const { supabase } = await requireSuperadmin();
  const { error } = await supabase.from("prompt_chains").delete().eq("id", id(form, "chain_id"));
  if (error) throw new Error(error.message);
  refresh();
}

export async function createStep(form: FormData) {
  const { supabase } = await requireSuperadmin();
  const chainId = id(form, "chain_id");
  const { data } = await supabase.from("prompt_chain_steps").select("step_order").eq("prompt_chain_id", chainId).order("step_order", { ascending: false }).limit(1);
  const { error } = await supabase.from("prompt_chain_steps").insert({
    prompt_chain_id: chainId,
    name: clean(form.get("title"), 80) || "Untitled step",
    template: clean(form.get("prompt")),
    step_order: (data?.[0]?.step_order ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function updateStep(form: FormData) {
  const { supabase } = await requireSuperadmin();
  const { error } = await supabase.from("prompt_chain_steps").update({ name: clean(form.get("title"), 80), template: clean(form.get("prompt")) }).eq("id", id(form, "step_id"));
  if (error) throw new Error(error.message);
  refresh();
}

async function normalize(supabase: Awaited<ReturnType<typeof requireSuperadmin>>["supabase"], chainId: string) {
  const { data } = await supabase.from("prompt_chain_steps").select("id").eq("prompt_chain_id", chainId).order("step_order");
  for (let index = 0; index < (data?.length ?? 0); index++) await supabase.from("prompt_chain_steps").update({ step_order: index + 1 }).eq("id", data![index].id);
}

export async function deleteStep(form: FormData) {
  const { supabase } = await requireSuperadmin();
  const chainId = id(form, "chain_id");
  const { error } = await supabase.from("prompt_chain_steps").delete().eq("id", id(form, "step_id"));
  if (error) throw new Error(error.message);
  await normalize(supabase, chainId);
  refresh();
}

export async function moveStep(form: FormData) {
  const { supabase } = await requireSuperadmin();
  const chainId = id(form, "chain_id");
  const stepId = id(form, "step_id");
  const direction = clean(form.get("direction"), 10);
  const { data } = await supabase.from("prompt_chain_steps").select("id,step_order").eq("prompt_chain_id", chainId).order("step_order");
  const index = data?.findIndex((step) => step.id === stepId) ?? -1;
  const target = direction === "up" ? index - 1 : index + 1;
  if (!data || index < 0 || target < 0 || target >= data.length) return;
  const temporary = Math.max(...data.map((step) => step.step_order)) + 1000;
  await supabase.from("prompt_chain_steps").update({ step_order: temporary }).eq("id", stepId);
  await supabase.from("prompt_chain_steps").update({ step_order: data[index].step_order }).eq("id", data[target].id);
  await supabase.from("prompt_chain_steps").update({ step_order: data[target].step_order }).eq("id", stepId);
  refresh();
}

type ResponseJson = { output_text?: string; output?: Array<{ content?: Array<{ type: string; text?: string }> }>; error?: { message?: string } };

async function generateText(apiKey: string, prompt: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_TEXT_MODEL || "gpt-5-mini", input: prompt, max_output_tokens: 700 }),
  });
  const json = await response.json() as ResponseJson;
  if (!response.ok) throw new Error(json.error?.message || `OpenAI request failed (${response.status}).`);
  return json.output_text || json.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text || "";
}

export async function runChain(form: FormData) {
  const { supabase, user } = await requireSuperadmin();
  const chainId = id(form, "chain_id");
  const input = clean(form.get("input"), 6000);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured for this Vercel project.");
  const { data: chain } = await supabase.from("prompt_chains").select("name").eq("id", chainId).single();
  const { data: steps, error } = await supabase.from("prompt_chain_steps").select("id,name,template,step_order").eq("prompt_chain_id", chainId).order("step_order");
  if (error || !steps?.length) throw new Error("Add at least one step before running this chain.");
  const { data: request, error: requestError } = await supabase.from("generation_requests").insert({ user_id: user.id, prompt_chain_id: chainId, input, status: "pending" }).select("id").single();
  if (requestError || !request) throw new Error(requestError?.message || "Could not create generation request.");
  try {
    let current = input;
    for (const step of steps) current = await generateText(apiKey, `You are step ${step.step_order} in a prompt chain named "${chain?.name}".\n\nInstruction:\n${step.template}\n\nInput from the user or previous step:\n${current}\n\nReturn only the requested result.`);
    await supabase.from("llm_responses").insert({ generation_request_id: request.id, response_text: current, status_code: 200 });
    await supabase.from("generation_requests").update({ status: "completed" }).eq("id", request.id);
  } catch (generationError) {
    await supabase.from("llm_responses").insert({ generation_request_id: request.id, response_text: generationError instanceof Error ? generationError.message : "Generation failed", status_code: 500 });
    await supabase.from("generation_requests").update({ status: "failed" }).eq("id", request.id);
    throw generationError;
  }
  refresh();
}
