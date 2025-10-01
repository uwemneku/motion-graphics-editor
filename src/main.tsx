//
import gsap from "gsap";
import { GSDevTools } from "gsap/GSDevTools";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import AppLayout from "./app/canvas/layout.tsx";
import ScreenContextProvider from "./app/context/screenContext/provider.tsx";
import ShapesRecordContextProvider from "./app/features/shapes/context.tsx";
import TimeLineContextProvider from "./app/features/timeline/context/index.tsx";
import { store } from "./app/store/index.ts";
import KonvaPlugin from "./app/util/plugin.ts";
import "./index.css";

gsap.registerPlugin(KonvaPlugin);
gsap.registerPlugin(GSDevTools);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ScreenContextProvider>
        <ShapesRecordContextProvider>
          <TimeLineContextProvider>
            <AppLayout />
          </TimeLineContextProvider>
        </ShapesRecordContextProvider>
      </ScreenContextProvider>
    </Provider>
  </StrictMode>,
);
