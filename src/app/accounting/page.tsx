"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";
import { FolderTree, BookOpen, Receipt, Plus, CheckCircle, AlertTriangle, Play, X, User } from "lucide-react";

interface AccountRecord {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  type: string;
  parentId: string | null;
  isActive: boolean;
  isCashOrBank: boolean;
  cashBankType: string | null;
  openingBalance: string;
  currentBalance: string;
}

interface JournalLine {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  description: string | null;
  account: AccountRecord;
}

interface JournalRecord {
  id: string;
  entryNumber: string;
  date: string;
  reference: string | null;
  notes: string | null;
  status: "DRAFT" | "POSTED";
  createdBy: { email: string } | null;
  items: JournalLine[];
}

interface VoucherRecord {
  id: string;
  voucherNumber: string;
  type: "RECEIPT" | "PAYMENT" | "TRANSFER";
  date: string;
  amount: string;
  reference: string | null;
  notes: string | null;
  status: string;
  fromAccount: AccountRecord | null;
  toAccount: AccountRecord | null;
  createdBy: { email: string } | null;
}

export default function AccountingPage() {
  const { t, i18n } = useTranslation(["accounting_foundation", "common"]);
  const isRtl = i18n.language === "ar";
  
  const [activeTab, setActiveTab] = useState<"accounts" | "journals" | "vouchers">("accounts");
  
  // Data lists
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [journals, setJournals] = useState<JournalRecord[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [viewJournal, setViewJournal] = useState<JournalRecord | null>(null);

  // Create Account form state
  const [accCode, setAccCode] = useState("");
  const [accNameEn, setAccNameEn] = useState("");
  const [accNameAr, setAccNameAr] = useState("");
  const [accType, setAccType] = useState("ASSET");
  const [accParentId, setAccParentId] = useState("");
  const [accIsCashBank, setAccIsCashBank] = useState(false);
  const [accCashBankType, setAccCashBankType] = useState("CASH");
  const [accOpeningBalance, setAccOpeningBalance] = useState("0");

  // Create Journal form state
  const [jeDate, setJeDate] = useState(new Date().toISOString().split("T")[0]);
  const [jeReference, setJeReference] = useState("");
  const [jeNotes, setJeNotes] = useState("");
  const [jeStatus, setJeStatus] = useState<"DRAFT" | "POSTED">("DRAFT");
  const [jeLines, setJeLines] = useState<Array<{ accountId: string; debit: number; credit: number; description: string }>>([
    { accountId: "", debit: 0, credit: 0, description: "" },
    { accountId: "", debit: 0, credit: 0, description: "" }
  ]);

  // Create Voucher form state
  const [vType, setVType] = useState<"RECEIPT" | "PAYMENT" | "TRANSFER">("RECEIPT");
  const [vAmount, setVAmount] = useState("");
  const [vFromAccountId, setVFromAccountId] = useState("");
  const [vToAccountId, setVToAccountId] = useState("");
  const [vReference, setVReference] = useState("");
  const [vNotes, setVNotes] = useState("");

  useEffect(() => {
    fetchAccounts();
    fetchJournals();
    fetchVouchers();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await apiRequest("/accounting/accounts");
      setAccounts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchJournals = async () => {
    try {
      const data = await apiRequest("/accounting/journals");
      setJournals(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVouchers = async () => {
    try {
      const data = await apiRequest("/accounting/vouchers");
      setVouchers(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Form Submissions
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accCode || !accNameEn || !accNameAr || !accType) {
      alert(t("validationRequired"));
      return;
    }

    try {
      await apiRequest("/accounting/accounts", {
        method: "POST",
        body: JSON.stringify({
          code: accCode,
          nameEn: accNameEn,
          nameAr: accNameAr,
          type: accType,
          parentId: accParentId || undefined,
          isCashOrBank: accIsCashBank,
          cashBankType: accIsCashBank ? accCashBankType : undefined,
          openingBalance: parseFloat(accOpeningBalance) || 0
        })
      });
      alert(t("toastAccountCreated"));
      setAccountModalOpen(false);
      fetchAccounts();
      // Reset
      setAccCode("");
      setAccNameEn("");
      setAccNameAr("");
      setAccParentId("");
      setAccIsCashBank(false);
      setAccOpeningBalance("0");
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out blank lines
    const activeLines = jeLines.filter(line => line.accountId !== "");
    if (activeLines.length < 2) {
      alert(t("validationMinLines"));
      return;
    }

    let sumDebit = 0;
    let sumCredit = 0;
    for (const l of activeLines) {
      sumDebit += l.debit;
      sumCredit += l.credit;
    }

    if (Math.abs(sumDebit - sumCredit) > 0.001) {
      alert(t("validationUnbalanced"));
      return;
    }

    try {
      await apiRequest("/accounting/journals", {
        method: "POST",
        body: JSON.stringify({
          date: jeDate,
          reference: jeReference,
          notes: jeNotes,
          status: jeStatus,
          items: activeLines
        })
      });
      alert(t("toastJournalCreated"));
      setJournalModalOpen(false);
      fetchJournals();
      fetchAccounts(); // Balances updated if POSTED
      // Reset
      setJeReference("");
      setJeNotes("");
      setJeLines([
        { accountId: "", debit: 0, credit: 0, description: "" },
        { accountId: "", debit: 0, credit: 0, description: "" }
      ]);
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(vAmount);
    if (!amount || amount <= 0) {
      alert(t("validationPositive"));
      return;
    }

    try {
      await apiRequest("/accounting/vouchers", {
        method: "POST",
        body: JSON.stringify({
          type: vType,
          amount,
          fromAccountId: vFromAccountId || undefined,
          toAccountId: vToAccountId || undefined,
          reference: vReference,
          notes: vNotes
        })
      });
      alert(t("toastVoucherCreated"));
      setVoucherModalOpen(false);
      fetchVouchers();
      fetchJournals();
      fetchAccounts();
      // Reset
      setVAmount("");
      setVFromAccountId("");
      setVToAccountId("");
      setVReference("");
      setVNotes("");
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handlePostJournal = async (id: string) => {
    try {
      await apiRequest(`/accounting/journals/${id}/post`, {
        method: "POST"
      });
      alert(t("toastJournalPosted"));
      fetchJournals();
      fetchAccounts();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const toggleAccountStatus = async (id: string, currentStatus: boolean) => {
    try {
      await apiRequest(`/accounting/accounts/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !currentStatus })
      });
      fetchAccounts();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  // Helper functions
  const getAccountName = (acc: AccountRecord) => {
    return isRtl ? acc.nameAr : acc.nameEn;
  };

  const formatCurrency = (val: string | number) => {
    const parsed = typeof val === "string" ? parseFloat(val) : val;
    return (parsed || 0).toLocaleString(isRtl ? "ar-IQ" : "en-US", {
      style: "currency",
      currency: "IQD",
      maximumFractionDigits: 0
    });
  };

  const getAccountTypeName = (type: string) => {
    switch (type) {
      case "ASSET": return t("typeAsset");
      case "LIABILITY": return t("typeLiability");
      case "EQUITY": return t("typeEquity");
      case "REVENUE": return t("typeRevenue");
      case "EXPENSE": return t("typeExpense");
      default: return type;
    }
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const lines = [...jeLines];
    lines[index] = { ...lines[index], [field]: value };
    setJeLines(lines);
  };

  const addJeLine = () => {
    setJeLines([...jeLines, { accountId: "", debit: 0, credit: 0, description: "" }]);
  };

  const removeJeLine = (index: number) => {
    if (jeLines.length <= 2) return;
    const lines = jeLines.filter((_, idx) => idx !== index);
    setJeLines(lines);
  };

  // Calculate live journal totals
  const totalDebits = jeLines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredits = jeLines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isJournalBalanced = Math.abs(totalDebits - totalCredits) < 0.001;

  // Filter accounts by type
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const cashAccounts = safeAccounts.filter(acc => acc?.isCashOrBank && acc?.cashBankType === "CASH" && acc?.isActive);
  const bankAccounts = safeAccounts.filter(acc => acc?.isCashOrBank && acc?.cashBankType === "BANK" && acc?.isActive);
  const cashBankOptions = safeAccounts.filter(acc => acc?.isCashOrBank && acc?.isActive);
  const generalAccounts = safeAccounts.filter(acc => acc?.isActive);

  // Group accounts by parent code or build nested tree list
  const rootLevelAccounts = safeAccounts.filter(acc => acc?.parentId === null);
  const getSubAccounts = (parentId: string) => safeAccounts.filter(acc => acc?.parentId === parentId);

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? "text-right" : "text-left"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
          </div>
          
          <div className="flex gap-3 self-start">
            {activeTab === "accounts" && (
              <button
                onClick={() => setAccountModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20"
              >
                <Plus className="h-5 w-5" />
                <span>{t("addAccount")}</span>
              </button>
            )}
            {activeTab === "journals" && (
              <button
                onClick={() => setJournalModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20"
              >
                <Plus className="h-5 w-5" />
                <span>{t("addJournal")}</span>
              </button>
            )}
            {activeTab === "vouchers" && (
              <button
                onClick={() => setVoucherModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20"
              >
                <Plus className="h-5 w-5" />
                <span>{t("addVoucher")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Buttons Navigation */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab("accounts")}
            className={`pb-3 text-sm font-bold transition ${
              activeTab === "accounts"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              <span>{t("tabAccounts")}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("journals")}
            className={`pb-3 text-sm font-bold transition ${
              activeTab === "journals"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>{t("tabJournals")}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("vouchers")}
            className={`pb-3 text-sm font-bold transition ${
              activeTab === "vouchers"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span>{t("tabVouchers")}</span>
            </div>
          </button>
        </div>

        {/* Tab Content Panels */}
        
        {/* Tab 1: Chart of Accounts */}
        {activeTab === "accounts" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-center">{t("colCode")}</th>
                    <th className="px-6 py-4 text-center">{t("colNameAr")}</th>
                    <th className="px-6 py-4 text-center">{t("colNameEn")}</th>
                    <th className="px-6 py-4 text-center">{t("colType")}</th>
                    <th className="px-6 py-4 text-center">{t("colBalance")}</th>
                    <th className="px-6 py-4 text-center">{t("colStatus")}</th>
                    <th className="px-6 py-4 text-center">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {rootLevelAccounts.map((rootAcc) => {
                    const childrenAcc = getSubAccounts(rootAcc.id);
                    return (
                      <React.Fragment key={rootAcc.id}>
                        {/* Parent Row */}
                        <tr className="bg-slate-50/50 hover:bg-slate-50 transition font-semibold">
                          <td className="px-6 py-4 text-center font-mono">{rootAcc.code}</td>
                          <td className="px-6 py-4 text-center">{rootAcc.nameAr}</td>
                          <td className="px-6 py-4 text-center">{rootAcc.nameEn}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold">
                              {getAccountTypeName(rootAcc.type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-800">{formatCurrency(rootAcc.currentBalance)}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => toggleAccountStatus(rootAcc.id, rootAcc.isActive)}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                                rootAcc.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-250 hover:bg-emerald-100"
                                  : "bg-rose-50 text-rose-700 border border-rose-250 hover:bg-rose-100"
                              }`}
                            >
                              {rootAcc.isActive ? t("statusActive") : t("statusInactive")}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-400">-</td>
                        </tr>

                        {/* Children Rows */}
                        {childrenAcc.map((childAcc) => (
                          <tr key={childAcc.id} className="hover:bg-slate-50/30 transition">
                            <td className="px-6 py-3.5 text-center font-mono pl-12 text-slate-500">{childAcc.code}</td>
                            <td className="px-6 py-3.5 text-center font-medium pl-8">{childAcc.nameAr}</td>
                            <td className="px-6 py-3.5 text-center pl-8">{childAcc.nameEn}</td>
                            <td className="px-6 py-3.5 text-center">
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">
                                {getAccountTypeName(childAcc.type)}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-center font-bold text-slate-800">{formatCurrency(childAcc.currentBalance)}</td>
                            <td className="px-6 py-3.5 text-center">
                              <button
                                onClick={() => toggleAccountStatus(childAcc.id, childAcc.isActive)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                                  childAcc.isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-250 hover:bg-emerald-100"
                                    : "bg-rose-50 text-rose-700 border border-rose-250 hover:bg-rose-100"
                                }`}
                              >
                                {childAcc.isActive ? t("statusActive") : t("statusInactive")}
                              </button>
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              {childAcc.isCashOrBank && (
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                                  {childAcc.cashBankType === "CASH" ? "CASH" : "BANK"}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                        {t("common:loading")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Journal Entries */}
        {activeTab === "journals" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-center">{t("colEntryNo")}</th>
                    <th className="px-6 py-4 text-center">{t("colDate")}</th>
                    <th className="px-6 py-4 text-center">{t("colReference")}</th>
                    <th className="px-6 py-4 text-center">{t("colNotes")}</th>
                    <th className="px-6 py-4 text-center">{t("colTotal")}</th>
                    <th className="px-6 py-4 text-center">{t("colPosted")}</th>
                    <th className="px-6 py-4 text-center">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {(Array.isArray(journals) ? journals : []).map((je) => {
                    const itemsArr = Array.isArray(je?.items) ? je.items : [];
                    const totalDebitSum = itemsArr.reduce((s, it) => s + (parseFloat(String(it?.debit)) || 0), 0);
                    return (
                      <tr key={je.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 text-center font-mono font-bold text-slate-800">{je?.entryNumber || "—"}</td>
                        <td className="px-6 py-4 text-center">{je?.date ? new Date(je.date).toLocaleDateString(isRtl ? "ar-IQ" : "en-US") : "—"}</td>
                        <td className="px-6 py-4 text-center text-slate-500 font-mono text-xs">{je?.reference || "-"}</td>
                        <td className="px-6 py-4 text-center max-w-[200px] truncate">{je?.notes || "-"}</td>
                        <td className="px-6 py-4 text-center font-bold text-blue-600">{formatCurrency(totalDebitSum)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            je.status === "POSTED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-250"
                              : "bg-amber-50 text-amber-700 border border-amber-250"
                          }`}>
                            {je.status === "POSTED" ? t("statusPosted") : t("statusDraft")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setViewJournal(je)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                            >
                              {t("common:actions")}
                            </button>
                            {je.status === "DRAFT" && (
                              <button
                                onClick={() => handlePostJournal(je.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
                              >
                                <Play className="h-3.5 w-3.5" />
                                <span>{t("statusPosted")}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {journals.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                        {t("common:loading")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Receipts & Payments Vouchers */}
        {activeTab === "vouchers" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-center">{t("colVoucherNo")}</th>
                    <th className="px-6 py-4 text-center">{t("colVoucherType")}</th>
                    <th className="px-6 py-4 text-center">{t("colDate")}</th>
                    <th className="px-6 py-4 text-center">{t("colAmount")}</th>
                    <th className="px-6 py-4 text-center">{t("colFromAccount")}</th>
                    <th className="px-6 py-4 text-center">{t("colToAccount")}</th>
                    <th className="px-6 py-4 text-center">{t("colReference")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {(Array.isArray(vouchers) ? vouchers : []).map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-800">{v?.voucherNumber || "—"}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          v?.type === "RECEIPT" ? "bg-emerald-50 text-emerald-700" :
                          v?.type === "PAYMENT" ? "bg-rose-50 text-rose-700" : "bg-purple-50 text-purple-700"
                        }`}>
                          {v?.type === "RECEIPT" ? t("voucherReceipt") :
                           v?.type === "PAYMENT" ? t("voucherPayment") : t("voucherTransfer")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">{v?.date ? new Date(v.date).toLocaleDateString(isRtl ? "ar-IQ" : "en-US") : "—"}</td>
                      <td className="px-6 py-4 text-center font-extrabold text-slate-900">{formatCurrency(String(v?.amount ?? 0))}</td>
                      <td className="px-6 py-4 text-center text-xs">
                        {v.fromAccount ? (
                          <div className="font-medium text-slate-800">
                            {getAccountName(v.fromAccount)}
                            <div className="text-[10px] text-slate-400 font-mono">({v.fromAccount.code})</div>
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-center text-xs">
                        {v.toAccount ? (
                          <div className="font-medium text-slate-800">
                            {getAccountName(v.toAccount)}
                            <div className="text-[10px] text-slate-400 font-mono">({v.toAccount.code})</div>
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">{v.reference || "-"}</td>
                    </tr>
                  ))}
                  {vouchers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                        {t("common:loading")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal dialogs */}
      
      {/* 1. Modal: Create Account */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("modalAddAccount")}</h3>
              <button onClick={() => setAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldCode")}</label>
                  <input
                    type="text"
                    value={accCode}
                    onChange={(e) => setAccCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                    placeholder="e.g. 101005"
                  />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldType")}</label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  >
                    <option value="ASSET">{t("typeAsset")}</option>
                    <option value="LIABILITY">{t("typeLiability")}</option>
                    <option value="EQUITY">{t("typeEquity")}</option>
                    <option value="REVENUE">{t("typeRevenue")}</option>
                    <option value="EXPENSE">{t("typeExpense")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldNameAr")}</label>
                  <input
                    type="text"
                    value={accNameAr}
                    onChange={(e) => setAccNameAr(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                    placeholder="مثال: الخزينة الفرعية"
                  />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldNameEn")}</label>
                  <input
                    type="text"
                    value={accNameEn}
                    onChange={(e) => setAccNameEn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                    placeholder="e.g. Petty Cash"
                  />
                </div>
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldParent")}</label>
                <select
                  value={accParentId}
                  onChange={(e) => setAccParentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                >
                  <option value="">{t("common:general")}</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {getAccountName(acc)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="isCashBank"
                  checked={accIsCashBank}
                  onChange={(e) => setAccIsCashBank(e.target.checked)}
                  className="h-4.5 w-4.5 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isCashBank" className="text-xs font-bold text-slate-700 cursor-pointer">{t("fieldIsCashBank")}</label>
              </div>

              {accIsCashBank && (
                <div className="grid grid-cols-2 gap-4 border border-slate-100 p-3 rounded-xl bg-slate-50">
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldCashBankType")}</label>
                    <select
                      value={accCashBankType}
                      onChange={(e) => setAccCashBankType(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none transition"
                    >
                      <option value="CASH">CASH (نقدية)</option>
                      <option value="BANK">BANK (بنكي)</option>
                    </select>
                  </div>
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldOpeningBalance")}</label>
                    <input
                      type="number"
                      value={accOpeningBalance}
                      onChange={(e) => setAccOpeningBalance(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none transition"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition"
                >
                  {t("common:cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-blue-500/10"
                >
                  {t("common:save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Create Journal Entry */}
      {journalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("modalAddJournal")}</h3>
              <button onClick={() => setJournalModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleCreateJournal} className="p-6 space-y-6">
              {/* Header Details */}
              <div className="grid grid-cols-3 gap-4">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldDate")}</label>
                  <input
                    type="date"
                    value={jeDate}
                    onChange={(e) => setJeDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldReference")}</label>
                  <input
                    type="text"
                    value={jeReference}
                    onChange={(e) => setJeReference(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                    placeholder="e.g. DOC-1234"
                  />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("colPosted")}</label>
                  <select
                    value={jeStatus}
                    onChange={(e) => setJeStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  >
                    <option value="DRAFT">{t("statusDraft")}</option>
                    <option value="POSTED">{t("statusPosted")}</option>
                  </select>
                </div>
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldNotes")}</label>
                <input
                  type="text"
                  value={jeNotes}
                  onChange={(e) => setJeNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  placeholder="Memo..."
                />
              </div>

              {/* Journal Lines Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t("journalLines")}</h4>
                  <button
                    type="button"
                    onClick={addJeLine}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                  >
                    + {t("addLine")}
                  </button>
                </div>

                <div className="max-h-[220px] overflow-y-auto border border-slate-150 rounded-xl">
                  <table className="w-full text-sm text-slate-600 text-center">
                    <thead className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-700">
                      <tr>
                        <th className="px-4 py-2 w-[40%]">{t("lineAccount")}</th>
                        <th className="px-4 py-2 w-[20%]">{t("lineDebit")}</th>
                        <th className="px-4 py-2 w-[20%]">{t("lineCredit")}</th>
                        <th className="px-4 py-2 w-[20%]">{t("lineDescription")}</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jeLines.map((line, index) => (
                        <tr key={index}>
                          <td className="p-2">
                            <select
                              value={line.accountId}
                              onChange={(e) => handleLineChange(index, "accountId", e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                            >
                              <option value="">-- Choose Account --</option>
                              {generalAccounts.map(a => (
                                <option key={a.id} value={a.id}>
                                  {a.code} - {getAccountName(a)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={line.debit || ""}
                              onChange={(e) => handleLineChange(index, "debit", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center outline-none font-mono"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={line.credit || ""}
                              onChange={(e) => handleLineChange(index, "credit", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center outline-none font-mono"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => handleLineChange(index, "description", e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                              placeholder="Memo..."
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeJeLine(index)}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals and validation alert bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl border border-slate-150 bg-slate-50 gap-3 text-xs">
                  <div className="flex gap-6 font-semibold">
                    <div>
                      <span>Total Debit: </span>
                      <span className="font-mono text-blue-600">{formatCurrency(totalDebits)}</span>
                    </div>
                    <div>
                      <span>Total Credit: </span>
                      <span className="font-mono text-blue-600">{formatCurrency(totalCredits)}</span>
                    </div>
                  </div>
                  
                  {isJournalBalanced ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>Balanced</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-rose-600 font-bold">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Unbalanced Difference: {formatCurrency(Math.abs(totalDebits - totalCredits))}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setJournalModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition"
                >
                  {t("common:cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!isJournalBalanced}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition shadow-md ${
                    isJournalBalanced
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  {t("common:save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Create Voucher */}
      {voucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("modalAddVoucher")}</h3>
              <button onClick={() => setVoucherModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleCreateVoucher} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldVoucherType")}</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  >
                    <option value="RECEIPT">{t("voucherReceipt")}</option>
                    <option value="PAYMENT">{t("voucherPayment")}</option>
                    <option value="TRANSFER">{t("voucherTransfer")}</option>
                  </select>
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldAmount")}</label>
                  <input
                    type="number"
                    value={vAmount}
                    onChange={(e) => setVAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {vType === "RECEIPT" ? t("fieldFromAccount") : t("fieldFromAccount")}
                  </label>
                  <select
                    value={vFromAccountId}
                    onChange={(e) => setVFromAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  >
                    <option value="">-- Choose Account --</option>
                    {/* Receipts usually: Credit Customer AR (110000) or other Account. Payments/Transfers usually: Credit Cash/Bank */}
                    {(vType === "PAYMENT" || vType === "TRANSFER") ? (
                      cashBankOptions.map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {getAccountName(a)}</option>
                      ))
                    ) : (
                      generalAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {getAccountName(a)}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {vType === "RECEIPT" ? t("fieldToAccount") : t("fieldToAccount")}
                  </label>
                  <select
                    value={vToAccountId}
                    onChange={(e) => setVToAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  >
                    <option value="">-- Choose Account --</option>
                    {/* Receipts/Transfers usually: Debit Cash/Bank. Payments: Debit AP (210000) or Expense */}
                    {(vType === "RECEIPT" || vType === "TRANSFER") ? (
                      cashBankOptions.map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {getAccountName(a)}</option>
                      ))
                    ) : (
                      generalAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {getAccountName(a)}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldReference")}</label>
                <input
                  type="text"
                  value={vReference}
                  onChange={(e) => setVReference(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  placeholder="Check number, Bank ref, etc."
                />
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fieldNotes")}</label>
                <input
                  type="text"
                  value={vNotes}
                  onChange={(e) => setVNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  placeholder="Description..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setVoucherModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition"
                >
                  {t("common:cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-blue-500/10"
                >
                  {t("common:save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: View Journal Details */}
      {viewJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("tabJournals")} - {viewJournal.entryNumber}</h3>
              <button onClick={() => setViewJournal(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div>
                  <span className="font-bold">{t("colDate")}: </span>
                  <span>{new Date(viewJournal.date).toLocaleDateString(isRtl ? "ar-IQ" : "en-US")}</span>
                </div>
                <div>
                  <span className="font-bold">{t("colReference")}: </span>
                  <span className="font-mono text-xs">{viewJournal.reference || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-bold">{t("colNotes")}: </span>
                  <span>{viewJournal.notes || "-"}</span>
                </div>
                <div>
                  <span className="font-bold">{t("colPosted")}: </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    viewJournal.status === "POSTED" ? "bg-emerald-50 text-emerald-700 border border-emerald-250" : "bg-amber-50 text-amber-700 border border-amber-250"
                  }`}>{viewJournal.status === "POSTED" ? t("statusPosted") : t("statusDraft")}</span>
                </div>
                {viewJournal.createdBy && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{viewJournal.createdBy.email}</span>
                  </div>
                )}
              </div>

              <div className="border border-slate-150 rounded-xl overflow-hidden mt-4">
                <table className="w-full text-sm text-slate-600 text-center">
                  <thead className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-2 w-[40%]">{t("lineAccount")}</th>
                      <th className="px-4 py-2 w-[25%]">{t("lineDebit")}</th>
                      <th className="px-4 py-2 w-[25%]">{t("lineCredit")}</th>
                      <th className="px-4 py-2 w-[35%]">{t("lineDescription")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(Array.isArray(viewJournal?.items) ? viewJournal.items : []).map((it) => (
                      <tr key={it.id}>
                        <td className="p-3 text-center text-xs font-semibold">
                          {it?.account ? `${it.account.code} - ${getAccountName(it.account)}` : "—"}
                        </td>
                        <td className={`p-3 text-center font-mono font-bold ${parseFloat(String(it?.debit ?? 0)) > 0 ? "text-slate-800" : "text-slate-300"}`}>
                          {parseFloat(String(it?.debit ?? 0)) > 0 ? formatCurrency(it.debit) : "-"}
                        </td>
                        <td className={`p-3 text-center font-mono font-bold ${parseFloat(String(it?.credit ?? 0)) > 0 ? "text-slate-800" : "text-slate-300"}`}>
                          {parseFloat(String(it?.credit ?? 0)) > 0 ? formatCurrency(it.credit) : "-"}
                        </td>
                        <td className="p-3 text-center text-xs text-slate-500">
                          {it?.description || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewJournal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
