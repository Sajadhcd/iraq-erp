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
      ],
      defaultNS: "common",
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
