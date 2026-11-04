import { requireSuperadmin } from "@/lib/auth";
import { createChain, createStep, deleteChain, deleteStep, moveStep, runChain, updateChain, updateStep } from "./actions";
import { ThemeToggle } from "./theme-toggle";
import { RunButton } from "./run-button";

export const dynamic = "force-dynamic";

type Chain = { id: string; name: string; description: string | null; created_at: string };
type Step = { id: string; prompt_chain_id: string; name: string; template: string; step_order: number };
type Response = { response_text: string | null };
type Run = { id: string; prompt_chain_id: string | null; status: string; input: string; created_at: string; llm_responses: Response[] | null };

export default async function Studio({ searchParams }: { searchParams: Promise<{ chain?: string }> }) {
  const { supabase, profile } = await requireSuperadmin();
  const { chain: selected } = await searchParams;
  const [{ data: chains }, { data: allSteps }, { data: runs }] = await Promise.all([
    supabase.from("prompt_chains").select("id,name,description,created_at").order("created_at", { ascending: false }),
    supabase.from("prompt_chain_steps").select("id,prompt_chain_id,name,template,step_order").order("step_order"),
    supabase.from("generation_requests").select("id,prompt_chain_id,status,input,created_at,llm_responses(response_text)").order("created_at", { ascending: false }).limit(30),
  ]);
  const typedChains = chains as Chain[] | null;
  const chain = typedChains?.find((item) => item.id === selected) || typedChains?.[0];
  const steps = (allSteps as Step[] | null)?.filter((item) => item.prompt_chain_id === chain?.id) || [];
  const chainRuns = (runs as Run[] | null)?.filter((item) => item.prompt_chain_id === chain?.id) || [];

  return <main className="min-h-screen">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-8">
      <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-[var(--violet)]">Campus Caption Clash</p><h1 className="text-xl font-black">Prompt Chain Studio</h1></div>
      <div className="flex items-center gap-4"><ThemeToggle/><span className="hidden text-sm text-[var(--muted)] md:inline">{profile.first_name || "Superadmin"}</span><form action="/auth/signout" method="post"><button className="text-sm font-black underline">Sign out</button></form></div>
    </header>
    <div className="grid min-h-[calc(100vh-77px)] lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-[var(--line)] p-5 lg:border-b-0 lg:border-r">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[var(--muted)]">Your chains</p>
        <nav className="mt-4 space-y-2">{typedChains?.map((item) => <a key={item.id} href={`/studio?chain=${item.id}`} className={`block border p-3 ${item.id === chain?.id ? "border-[var(--ink)] bg-[var(--acid)] text-black" : "border-[var(--line)] bg-[var(--card)]"}`}><strong className="block text-sm">{item.name}</strong><span className="mt-1 block truncate text-xs opacity-65">{item.description || "No description"}</span></a>)}</nav>
        <details className="mt-5 border border-dashed border-[var(--line)] p-3" open={!chains?.length}><summary className="cursor-pointer text-sm font-black">＋ New chain</summary><form action={createChain} className="mt-3 space-y-2"><input name="name" className="field" placeholder="Chain name" required/><textarea name="description" className="field" placeholder="What does it make?"/><button className="bg-[var(--ink)] px-4 py-2 text-sm font-black text-[var(--paper)]">Create chain</button></form></details>
      </aside>
      <section className="min-w-0 p-5 sm:p-8">
        {!chain ? <div className="card p-10 text-center"><h2 className="text-4xl font-black">Start with a chain.</h2><p className="mt-3 text-[var(--muted)]">Create your first workflow from the panel on the left.</p></div> : <>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <form action={updateChain} className="min-w-0 flex-1"><input type="hidden" name="chain_id" value={chain.id}/><input name="name" defaultValue={chain.name} className="w-full bg-transparent text-4xl font-black tracking-[-.04em] outline-none sm:text-5xl"/><input name="description" defaultValue={chain.description || ""} placeholder="Add a short description…" className="mt-2 w-full bg-transparent text-[var(--muted)] outline-none"/><button className="mt-2 text-xs font-black uppercase tracking-wider text-[var(--violet)]">Save details</button></form>
            <form action={deleteChain}><input type="hidden" name="chain_id" value={chain.id}/><button className="text-xs font-black uppercase tracking-wider text-red-500">Delete chain</button></form>
          </div>
          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
            <div>
              <div className="flex items-center justify-between"><h2 className="text-xs font-black uppercase tracking-[.2em] text-[var(--muted)]">Workflow · {steps.length} steps</h2><span className="text-xs text-[var(--muted)]">Use arrows to reorder</span></div>
              <div className="mt-4 space-y-4">
                {steps.map((step, index) => <article className="card p-4 sm:p-5" key={step.id}>
                  <div className="flex gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--violet)] text-sm font-black text-white">{index + 1}</span><form action={updateStep} className="min-w-0 flex-1 space-y-3"><input type="hidden" name="step_id" value={step.id}/><input className="field font-bold" name="title" defaultValue={step.name}/><textarea className="field min-h-28 resize-y text-sm leading-6" name="prompt" defaultValue={step.template}/><button className="text-xs font-black uppercase tracking-wider text-[var(--violet)]">Save step</button></form></div>
                  <div className="mt-3 flex justify-end gap-2"><form action={moveStep}><input type="hidden" name="chain_id" value={chain.id}/><input type="hidden" name="step_id" value={step.id}/><button disabled={index === 0} name="direction" value="up" className="border border-[var(--line)] px-3 py-1 text-sm">↑</button><button disabled={index === steps.length - 1} name="direction" value="down" className="border border-[var(--line)] px-3 py-1 text-sm">↓</button></form><form action={deleteStep}><input type="hidden" name="chain_id" value={chain.id}/><input type="hidden" name="step_id" value={step.id}/><button className="px-2 py-1 text-xs font-bold text-red-500">Delete</button></form></div>
                </article>)}
                <details className="border border-dashed border-[var(--line)] p-4" open={!steps.length}><summary className="cursor-pointer font-black">＋ Add prompt step</summary><form action={createStep} className="mt-4 space-y-3"><input type="hidden" name="chain_id" value={chain.id}/><input name="title" className="field" placeholder="e.g. Find the funny angle" required/><textarea name="prompt" className="field min-h-28" placeholder="Describe what this step should do with the previous output…" required/><button className="bg-[var(--ink)] px-4 py-3 text-sm font-black text-[var(--paper)]">Add text-media step</button></form></details>
              </div>
            </div>
            <aside><section className="card sticky top-5 p-5"><p className="text-xs font-black uppercase tracking-[.2em] text-[var(--violet)]">Run this chain</p><form action={runChain} className="mt-4"><input type="hidden" name="chain_id" value={chain.id}/><textarea name="input" className="field min-h-32" placeholder="Paste the starting idea, scene, or description…" required/><div className="mt-3"><RunButton/></div></form></section></aside>
          </div>
          <section className="mt-10">
            <div className="flex items-center justify-between"><h2 className="text-xs font-black uppercase tracking-[.2em] text-[var(--muted)]">Generated text media</h2><span className="text-xs text-[var(--muted)]">{chainRuns.length} recent runs</span></div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{chainRuns.map((run) => <article key={run.id} className="card p-5"><div className="flex items-center justify-between"><span className={`text-[10px] font-black uppercase tracking-wider ${run.status === "failed" ? "text-red-500" : "text-[var(--violet)]"}`}>{run.status}</span><time className="text-[10px] text-[var(--muted)]">{new Date(run.created_at).toLocaleDateString()}</time></div><p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-6">{run.llm_responses?.[0]?.response_text || "Generation in progress…"}</p><p className="mt-4 truncate border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">Input: {run.input}</p></article>)}{!chainRuns.length && <div className="border border-dashed border-[var(--line)] p-8 text-sm text-[var(--muted)]">No media yet. Run the chain to create the first result.</div>}</div>
          </section>
        </>}
      </section>
    </div>
  </main>;
}
