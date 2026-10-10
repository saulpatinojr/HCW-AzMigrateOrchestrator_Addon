import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PaneApp } from "./PaneApp.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PaneApp />
  </StrictMode>,
);
