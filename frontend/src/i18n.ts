import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enLeaderboard from "./locales/en/leaderboard.json";
import enAuth from "./locales/en/auth.json";
import enAdmin from "./locales/en/admin.json";

import ptCommon from "./locales/pt/common.json";
import ptLeaderboard from "./locales/pt/leaderboard.json";
import ptAuth from "./locales/pt/auth.json";
import ptAdmin from "./locales/pt/admin.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        leaderboard: enLeaderboard,
        auth: enAuth,
        admin: enAdmin,
      },
      pt: {
        common: ptCommon,
        leaderboard: ptLeaderboard,
        auth: ptAuth,
        admin: ptAdmin,
      },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "pt"],
    ns: ["common", "leaderboard", "auth", "admin"],
    defaultNS: "common",
    load: "languageOnly",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });

export default i18n;

