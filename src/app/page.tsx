"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("sims_session");
    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
}
