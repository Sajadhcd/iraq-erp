import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import commonAr from "../locales/ar/common.json";
import commonEn from "../locales/en/common.json";
import dashboardAr from "../locales/ar/dashboard.json";
import dashboardEn from "../locales/en/dashboard.json";
import posAr from "../locales/ar/pos.json";
import posEn from "../locales/en/pos.json";
import productsAr from "../locales/ar/products.json";
import productsEn from "../locales/en/products.json";
import customersAr from "../locales/ar/customers.json";
import customersEn from "../locales/en/customers.json";
import suppliersAr from "../locales/ar/suppliers.json";
import suppliersEn from "../locales/en/suppliers.json";
import inventoryAr from "../locales/ar/inventory.json";
import inventoryEn from "../locales/en/inventory.json";
import purchasesAr from "../locales/ar/purchases.json";
import purchasesEn from "../locales/en/purchases.json";
import salesAr from "../locales/ar/sales.json";
import salesEn from "../locales/en/sales.json";
import reportsAr from "../locales/ar/reports.json";
import reportsEn from "../locales/en/reports.json";
import accountingAr from "../locales/ar/accounting.json";
import accountingEn from "../locales/en/accounting.json";
import hrAr from "../locales/ar/hr.json";
import hrEn from "../locales/en/hr.json";
import settingsAr from "../locales/ar/settings.json";
import settingsEn from "../locales/en/settings.json";
import authenticationAr from "../locales/ar/authentication.json";
import authenticationEn from "../locales/en/authentication.json";
import accountingFoundationAr from "../locales/ar/accounting_foundation.json";
import accountingFoundationEn from "../locales/en/accounting_foundation.json";
import financialReportsAr from "../locales/ar/financial_reports.json";
import financialReportsEn from "../locales/en/financial_reports.json";
import crmAr from "../locales/ar/crm.json";
import crmEn from "../locales/en/crm.json";
import quotationsAr from "../locales/ar/quotations.json";
import quotationsEn from "../locales/en/quotations.json";
import salesOrdersAr from "../locales/ar/sales_orders.json";
import salesOrdersEn from "../locales/en/sales_orders.json";
import hrmsAr from "../locales/ar/hrms.json";
import hrmsEn from "../locales/en/hrms.json";
import attendanceAr from "../locales/ar/attendance.json";
import attendanceEn from "../locales/en/attendance.json";
import leaveAr from "../locales/ar/leave.json";
import leaveEn from "../locales/en/leave.json";
import payrollAr from "../locales/ar/payroll.json";
import payrollEn from "../locales/en/payroll.json";

const resources = {
  ar: {
    common: commonAr,
    dashboard: dashboardAr,
    pos: posAr,
    products: productsAr,
    customers: customersAr,
    suppliers: suppliersAr,
    inventory: inventoryAr,
    purchases: purchasesAr,
    sales: salesAr,
    reports: reportsAr,
    accounting: accountingAr,
    hr: hrAr,
    settings: settingsAr,
    authentication: authenticationAr,
    accounting_foundation: accountingFoundationAr,
    financial_reports: financialReportsAr,
    crm: crmAr,
    quotations: quotationsAr,
    sales_orders: salesOrdersAr,
    hrms: hrmsAr,
    attendance: attendanceAr,
    leave: leaveAr,
    payroll: payrollAr,
  },
  en: {
    common: commonEn,
    dashboard: dashboardEn,
    pos: posEn,
    products: productsEn,
    customers: customersEn,
    suppliers: suppliersEn,
    inventory: inventoryEn,
    purchases: purchasesEn,
    sales: salesEn,
    reports: reportsEn,
    accounting: accountingEn,
    hr: hrEn,
    settings: settingsEn,
    authentication: authenticationEn,
    accounting_foundation: accountingFoundationEn,
    financial_reports: financialReportsEn,
    crm: crmEn,
    quotations: quotationsEn,
    sales_orders: salesOrdersEn,
    hrms: hrmsEn,
    attendance: attendanceEn,
    leave: leaveEn,
    payroll: payrollEn,
  },
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: "ar",
      fallbackLng: "ar",
      ns: [
        "common",
        "dashboard",
        "pos",
        "products",
        "customers",
        "suppliers",
        "inventory",
        "purchases",
        "sales",
        "reports",
        "accounting",
        "hr",
        "settings",
        "authentication",
        "accounting_foundation",
        "financial_reports",
        "crm",
        "quotations",
        "sales_orders",
        "hrms",
        "attendance",
        "leave",
        "payroll",
      ],
      defaultNS: "common",
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
