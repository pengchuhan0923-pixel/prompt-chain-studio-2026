"use client";
import {useFormStatus} from "react-dom";
export function RunButton(){const{pending}=useFormStatus();return <button disabled={pending} className="bg-[var(--acid)] px-5 py-3 text-sm font-black text-black">{pending?"Running chain…":"Generate media ✦"}</button>}
