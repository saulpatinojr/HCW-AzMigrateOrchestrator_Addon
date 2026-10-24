import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PaneApp } from "./PaneApp.js";
import { applyThemeParam } from "./theme.js";

applyThemeParam(window.location.search, document.documentElement);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PaneApp />
  </StrictMode>,
);
