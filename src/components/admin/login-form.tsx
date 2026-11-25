"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { loginAction, type LoginState } from "@/app/admin/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block text-[12.5px] font-semibold text-fg-2">
        Senha
        <div className="mt-1.5 flex h-11 items-center rounded-[8px] border border-white/[0.06] bg-white/[0.02] px-3 focus-within:border-primary/60">
          <Lock size={16} className="text-fg-2" />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="ml-2.5 h-full flex-1 bg-transparent text-[14px] text-fg outline-none"
          />
        </div>
      </label>
      {state.error && <p className="text-[12.5px] text-primary">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-solid-red h-11 w-full rounded-[8px] text-[14px] font-semibold disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
