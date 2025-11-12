import { useAppDispatch } from "@/app/store";
import { proxy, transfer } from "comlink";
import gsap from "gsap";
import { useRef, useState, type PropsWithChildren } from "react";
import { setCurrentTime } from "../timeline/slice";
import { App } from "../web-workers/app";
import CanvasWorkerProxy from "../web-workers/main-thread-exports";
import type { FrontendCallback } from "../web-workers/types";
import { CanvasWorkerContext, type ICanvasWorkerContext } from "./useCanvasContext";

function CanvasWorkerProvider(props: PropsWithChildren) {
  const app = useRef<typeof CanvasWorkerProxy>(undefined);
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement | null>(undefined);

  const [hasInitializedWorker, setHasInitializedWorker] = useState(false);

  const highlightShape: FrontendCallback["highlightShape"] = (width, height, top, left, angle) => {
    const PADDING = 10;
    console.log({ left, angle });

    if (containerRef?.current)
      gsap.to(containerRef.current, {
        "--highlight-rect-width": `${width + PADDING}px`,
        "--highlight-rect-height": `${height + PADDING}px`,
        "--highlight-rect-top": `${top - height / 2 - PADDING / 2}px`,
        "--highlight-rect-left": `${left - width / 2 - PADDING / 2}px`,
        "--highlight-rect-angle": `${angle}deg`,
        duration: 0,
      });
  };

  const clearShapeHighlight: FrontendCallback["clearShapeHighlight"] = () => {
    if (containerRef?.current)
      gsap.to(containerRef.current, {
        "--highlight-rect-width": `${0}px`,
        "--highlight-rect-height": `${0}px`,
        "--highlight-rect-top": `${0}px`,
        "--highlight-rect-left": `${0}px`,
        "--highlight-rect-angle": `${0}`,
        duration: 0,
      });
  };

  const initializeCanvasWorker: ICanvasWorkerContext["initializeCanvasWorker"] = async (
    canvas,
    upperCanvas,
    width: number,
    height: number,
    pixelRatio,
    options,
  ) => {
    containerRef.current = options.containerRef;
    const isWebWorkerEnabled = true;
    const ClassInstance = isWebWorkerEnabled ? CanvasWorkerProxy : App;
    const getOffscreenCanvas = (node: HTMLCanvasElement) => {
      if (!isWebWorkerEnabled) return node;
      const offscreenCanvas = node.transferControlToOffscreen();
      return transfer(offscreenCanvas, [offscreenCanvas]);
    };

    const _callback = proxy(() => options?.containerRef?.getBoundingClientRect());

    //@ts-expect-error error occurs because of have to make app work in either worker env or main thread
    app.current = await new ClassInstance(
      getOffscreenCanvas(canvas),
      getOffscreenCanvas(upperCanvas),
      width,
      height,
      pixelRatio,
    );
    app.current?.addEventListener("getBoundingClientRect", _callback);
    app.current?.addEventListener(
      "updateCursor",
      proxy((e: string) => {
        canvas.style.cursor = e;
      }),
    );
    app.current?.addEventListener("highlightShape", proxy(highlightShape));
    app.current?.addEventListener("clearShapeHighlight", proxy(clearShapeHighlight));
    app.current?.addEventListener(
      "timeline:update",
      proxy((time: number) => {
        dispatch(setCurrentTime(time));
      }),
    );
    setHasInitializedWorker(true);
  };

  return (
    <CanvasWorkerContext.Provider
      value={{
        initializeCanvasWorker,
        app: app.current,
        hasInitializedWorker,
        clearShapeHighlight,
        highlightShape,
      }}
    >
      {props.children}
    </CanvasWorkerContext.Provider>
  );
}

export default CanvasWorkerProvider;
