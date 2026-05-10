import { createContext, useContext } from "react";

/* ── Context ── */
export const LangContext = createContext();
export const useLang = () => useContext(LangContext);
