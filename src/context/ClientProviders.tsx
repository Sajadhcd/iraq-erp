"use client";

import React, { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../services/i18nConfigs";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read lang on client mount
    const savedLang = localStorage.getItem("sims_lang") || "ar";
    if (savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
    }
    
    // Set document layouts direction
    const isRtl = savedLang === "ar";
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = savedLang;
    
    setMounted(true);
  }, []);

  if (!mounted) {
    // Fallback wrapper before client mount to prevent flash of content
    return <div dir="rtl" className="font-sans antialiased">{children}</div>;
  }

  const isRtl = i18n.language === "ar";

  return (
    <I18nextProvider i18n={i18n}>
      <div dir={isRtl ? "rtl" : "ltr"} className="font-sans antialiased">
        {children}
      </div>
    </I18nextProvider>
  );
}
