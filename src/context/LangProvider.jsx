import { useState } from "react";
import { LangContext } from "./LangContext";
import { TRANSLATIONS } from "../constants/translations";

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("sl_lang_code") || "en");

  const switchLang = (code) => {
    setLang(code);
    localStorage.setItem("sl_lang_code", code);
  };

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return (
    <LangContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LangContext.Provider>
  );
};
