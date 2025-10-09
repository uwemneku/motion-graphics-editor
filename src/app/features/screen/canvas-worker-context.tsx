import { transfer } from "comlink";
import { createContext, useContext, useRef, useState, type PropsWithChildren } from "react";
import { App } from "../shapes/rectangle";
import CanvasWorkerProxy from "../web-workers/main-thread-exports";

type WrapClassMethodInPromise<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
    : T[K];
};

type ICanvasWorkerContext = {
  initializeCanvasWorker: (
    offscreenCanvas: OffscreenCanvas,
    width: number,
    height: number,
    pixelRatio: number,
  ) => void;
  app?: WrapClassMethodInPromise<App>;
};

const CanvasWorkerContext = createContext<ICanvasWorkerContext>({
  initializeCanvasWorker() {},
});

function CanvasWorkerProvider(props: PropsWithChildren) {
  const app = useRef<WrapClassMethodInPromise<App>>(undefined);
  const [trigger, setTrigger] = useState(0);

  const initializeCanvasWorker: ICanvasWorkerContext["initializeCanvasWorker"] = async (
    offscreenCanvas: OffscreenCanvas,
    width: number,
    height: number,
    pixelRatio,
  ) => {
    app.current = await new CanvasWorkerProxy(
      transfer(offscreenCanvas, [offscreenCanvas]),
      width,
      height,
      pixelRatio,
    );
    setTrigger((prev) => prev + 1);
  };

  return (
    <CanvasWorkerContext.Provider
      value={{
        initializeCanvasWorker,
        app: app.current,
      }}
    >
      {props.children}
    </CanvasWorkerContext.Provider>
  );
}

export const useCanvasWorkerContext = () => useContext(CanvasWorkerContext);

export default CanvasWorkerProvider;
