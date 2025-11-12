import { createContext, useContext } from "react";
import type CanvasWorkerProxy from "../web-workers/main-thread-exports";
import type { FrontendCallback } from "../web-workers/types";

export type ICanvasWorkerContext = {
  initializeCanvasWorker: (
    canvas: HTMLCanvasElement,
    upperCanvas: HTMLCanvasElement,
    width: number,
    height: number,
    pixelRatio: number,
    options: {
      containerRef?: HTMLDivElement;
    },
  ) => void;
  app?: typeof CanvasWorkerProxy;
  hasInitializedWorker: boolean;
} & Pick<FrontendCallback, "clearShapeHighlight" | "highlightShape">;

export const CanvasWorkerContext = createContext<ICanvasWorkerContext>({
  initializeCanvasWorker() {},
  hasInitializedWorker: false,
  highlightShape(width, height, top, left) {},
  clearShapeHighlight() {},
});
export const useCanvasWorkerContext = () => useContext(CanvasWorkerContext);
