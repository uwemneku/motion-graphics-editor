import { transfer } from "comlink";
import { createContext, useContext, type PropsWithChildren } from "react";
import canvasWorkerProxy from "../web-workers/main-thread-exports";
import type { IOffscreenRenderer } from "../web-workers/types";

type ICanvasWorkerContext = {
  [key in keyof IOffscreenRenderer]: IOffscreenRenderer[key] extends (
    ...args: any[]
  ) => any
    ? (
        ...args: Parameters<IOffscreenRenderer[key]>
      ) => Promise<ReturnType<IOffscreenRenderer[key]>>
    : IOffscreenRenderer[key];
};
const CanvasWorkerContext = createContext<ICanvasWorkerContext>({
  async createShape() {
    return { id: "" };
  },
  async init() {},
  async onCanvasResize() {},
  async onCanvasMouseMove() {},
  async getShapeUsingCoordinates() {},
  async modifyShape() {},
});
function CanvasWorkerProvider(props: PropsWithChildren) {
  const initializeCanvasWorker: ICanvasWorkerContext["init"] = async (
    offscreenCanvas,
    width,
    height,
  ) => {
    await canvasWorkerProxy.init(
      transfer(offscreenCanvas, [offscreenCanvas]),
      width,
      height,
      window.devicePixelRatio,
    );
  };
  return (
    <CanvasWorkerContext.Provider
      value={{
        createShape: canvasWorkerProxy.createShape,
        init: initializeCanvasWorker,
        onCanvasResize: canvasWorkerProxy.onCanvasResize,
        onCanvasMouseMove: canvasWorkerProxy.onCanvasMouseMove,
        getShapeUsingCoordinates: canvasWorkerProxy.getShapeUsingCoordinates,
        modifyShape: canvasWorkerProxy.modifyShape,
      }}
    >
      {props.children}
    </CanvasWorkerContext.Provider>
  );
}

export const useCanvasWorkerContext = () => useContext(CanvasWorkerContext);

export default CanvasWorkerProvider;
