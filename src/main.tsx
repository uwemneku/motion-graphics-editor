//
import gsap from "gsap";
import { GSDevTools } from "gsap/GSDevTools";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import CanvasWorkerProvider from "./app/features/canvas/canvas-worker-context.tsx";
import TimeLineContextProvider from "./app/features/timeline/context/index.tsx";
import AppLayout from "./app/layout/layout.tsx";
import { store } from "./app/store/index.ts";
import KonvaPlugin from "./app/util/plugin.ts";
import "./index.css";

gsap.registerPlugin(KonvaPlugin);
gsap.registerPlugin(GSDevTools);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <TimeLineContextProvider>
        <CanvasWorkerProvider>
          <AppLayout />
        </CanvasWorkerProvider>
      </TimeLineContextProvider>
    </Provider>
  </StrictMode>,
);
