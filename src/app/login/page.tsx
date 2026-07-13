"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, Warehouse, Globe } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation(["authentication", "common"]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("sims_session");
    if (session) {
      router.push("/dashboard");
    }
  }, [router]);

  const toggleLanguage = () => {
    const nextLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("sims_lang", nextLang);
    document.documentElement.dir = nextLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = nextLang;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("sims_token", response.token);
      localStorage.setItem("sims_session", JSON.stringify(response.user));
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || t("errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  const isRtl = i18n.language === "ar";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-800 to-blue-900 px-4" dir={isRtl ? "rtl" : "ltr"}>
      {/* Absolute top-4 corner language toggle */}
      <div className={`absolute top-4 ${isRtl ? "left-4" : "right-4"}`}>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 transition"
        >
          <Globe className="h-4 w-4" />
          <span>{t("common:langName")}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
            <Warehouse className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">{t("loginTitle")}</h1>
          <p className="text-slate-500 text-sm">{t("common:appName")}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-100 flex items-start gap-2.5 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-sm font-semibold text-slate-700 mb-2 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "اسم المستخدم أو البريد الإلكتروني" : "Username or Email Address"}</label>
            <div className="relative">
              <input
                type="text"
                required
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 ${isRtl ? "text-right pr-11 pl-4" : "text-left pl-11 pr-4"}`}
                placeholder={isRtl ? "اسم المستخدم أو البريد الإلكتروني" : "username or email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className={`absolute top-3.5 h-5 w-5 text-slate-400 ${isRtl ? "right-4" : "left-4"}`} />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold text-slate-700 mb-2 ${isRtl ? "text-right" : "text-left"}`}>{t("password")}</label>
            <div className="relative">
              <input
                type="password"
                required
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 ${isRtl ? "text-right pr-11 pl-4" : "text-left pl-11 pr-4"}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className={`absolute top-3.5 h-5 w-5 text-slate-400 ${isRtl ? "right-4" : "left-4"}`} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-75 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            ) : (
              <span>{t("loginBtn")}</span>
            )}
          </button>
        </form>


      </div>
    </div>
  );
}
