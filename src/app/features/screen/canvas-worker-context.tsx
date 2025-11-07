import { proxy, transfer } from "comlink";
import { createContext, useContext, useRef, useState, type PropsWithChildren } from "react";
import { App } from "../shapes/app";
import CanvasWorkerProxy from "../web-workers/main-thread-exports";

type WrapClassMethodInPromise<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
    : T[K];
};

type ICanvasWorkerContext = {
  initializeCanvasWorker: (
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    pixelRatio: number,
    callback: Element["getBoundingClientRect"],
  ) => void;
  app?: WrapClassMethodInPromise<App>;
  hasInitializedWorker: boolean;
};

const CanvasWorkerContext = createContext<ICanvasWorkerContext>({
  initializeCanvasWorker() {},
  hasInitializedWorker: false,
});

function CanvasWorkerProvider(props: PropsWithChildren) {
  const app = useRef<WrapClassMethodInPromise<App>>(undefined);
  const [hasInitializedWorker, setHasInitializedWorker] = useState(false);

  const initializeCanvasWorker: ICanvasWorkerContext["initializeCanvasWorker"] = async (
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    pixelRatio,
    callback,
  ) => {
    const isWebWorkerEnabled = true;
    const ClassInstance = isWebWorkerEnabled ? CanvasWorkerProxy : App;
    const getOffscreenCanvas = () => {
      const offscreenCanvas = canvas.transferControlToOffscreen();
      return transfer(offscreenCanvas, [offscreenCanvas]);
    };
    const _callback = proxy(callback);
    app.current = await new ClassInstance(
      isWebWorkerEnabled ? getOffscreenCanvas() : canvas,
      width,
      height,
      pixelRatio,
      _callback,
    );
    app.current?.addEventListener("getBoundingClientRect", _callback);
    app.current?.addEventListener(
      "updateCursor",
      proxy((e: string) => {
        canvas.style.cursor = e;
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
      }}
    >
      {props.children}
    </CanvasWorkerContext.Provider>
  );
}

export const useCanvasWorkerContext = () => useContext(CanvasWorkerContext);

export default CanvasWorkerProvider;
