import gsap from "gsap";
import { GSDevTools } from "gsap/GSDevTools";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppLayout from "./app/canvas/layout.tsx";
import ScreenContextProvider from "./app/context/screenContext/provider.tsx";
import KonvaPlugin from "./app/util/plugin.ts";
import "./index.css";

gsap.registerPlugin(KonvaPlugin);
gsap.registerPlugin(GSDevTools);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ScreenContextProvider>
      <AppLayout />
    </ScreenContextProvider>
  </StrictMode>,
);
