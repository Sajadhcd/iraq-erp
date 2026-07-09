import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { ClientProviders } from "@/context/ClientProviders";
import "./globals.css";

const tajawal = Tajawal({
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  subsets: ["arabic"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "نظام إدارة المبيعات والمخزون للمؤسسات",
  description: "نظام متكامل لإدارة المبيعات، المخزون، المشتريات، والفوترة الإلكترونية المتوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
