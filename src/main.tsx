import gsap from "gsap";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppLayout from "./app/canvas/layout.tsx";
import KonvaPlugin from "./app/util/plugin.ts";
import "./index.css";

gsap.registerPlugin(KonvaPlugin);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppLayout />
  </StrictMode>
);
