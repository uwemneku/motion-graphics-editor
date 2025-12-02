import { useAppDispatch } from "@/app/store";
import { proxy, transfer } from "comlink";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { deleteShape } from "../shapes/slice";
import { addKeyFrame, setCurrentTime } from "../timeline/slice";
import { App } from "../web-workers/app";
import CanvasWorkerProxy from "../web-workers/main-thread-exports";
import type { FrontendCallback } from "../web-workers/types";
import { CanvasWorkerContext, type ICanvasWorkerContext } from "./useCanvasContext";

function CanvasWorkerProvider(props: PropsWithChildren) {
  const app = useRef<typeof CanvasWorkerProxy>(undefined);
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement | null>(undefined);

  const [hasInitializedWorker, setHasInitializedWorker] = useState(false);

  // Why not highlight shapes using the canvas ?
  // Because we need the highlight to always be above the shapes. Since we used a clip-rect on the canvas, this becomes a bit difficult to achieve in the canvas when shapes are outside the clip rect
  const highlightShape: FrontendCallback["highlightShape"] = (width, height, top, left, angle) => {
    const PADDING = 10;

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
    // await ClassInstance.loadFont();
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
        upperCanvas.style.cursor = e;
      }),
    );
    app.current?.addEventListener("highlightShape", proxy(highlightShape));
    app.current?.addEventListener("clearShapeHighlight", proxy(clearShapeHighlight));
    app.current?.addEventListener(
      "registerFont",
      proxy((name: string, url: string) => {
        const font = new FontFace("lato", `url(${url})`);
        document.fonts.add(font);
        font.load();
      }),
    );

    app.current?.addEventListener(
      "timeline:update",
      proxy<FrontendCallback["timeline:update"]>((time, onUpdate) => {
        dispatch(setCurrentTime(time));
        onUpdate?.(Date.now());
      }),
    );
    app.current?.addEventListener(
      "keyframe:add",
      proxy<FrontendCallback["keyframe:add"]>(
        (id, time, keyframeDetails, animatableProperty, value) => {
          dispatch(addKeyFrame([id, time, keyframeDetails, animatableProperty, value]));
        },
      ),
    );
    setHasInitializedWorker(true);
  };

  const seekTimeLine = (time: number) => {
    const _time = Math.min(10, Math.max(0, time));
    app.current?.pause();
    app.current?.seek(_time);
    dispatch(setCurrentTime(_time));
  };

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      console.log(e.key);

      switch (e.key) {
        case "Backspace":
        case "Delete":
          app?.current?.deleteSelectedShapes().then((ids) => {
            ids.forEach((id) => {
              dispatch(deleteShape(id));
            });
          });
          break;
        case " ":
          {
            const isPlaying = await app.current?.isPlaying;
            console.log({ isPlaying });

            if (!isPlaying) {
              app.current?.play();
            } else {
              app.current?.pause();
            }
          }
          break;
      }
    },
    [dispatch],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <CanvasWorkerContext.Provider
      value={{
        initializeCanvasWorker,
        app: app.current,
        hasInitializedWorker,
        clearShapeHighlight,
        highlightShape,
        seekTimeLine,
      }}
    >
      {props.children}
    </CanvasWorkerContext.Provider>
  );
}

export default CanvasWorkerProvider;
