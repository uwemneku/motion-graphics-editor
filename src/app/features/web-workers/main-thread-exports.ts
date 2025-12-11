import { wrap, type Remote } from "comlink";
import type { MotionEditor } from "./app";
import offscreenWorker from "./canvas-worker?worker";
const workerInstance = new offscreenWorker();
const CanvasWorkerProxy = wrap<Remote<MotionEditor>>(workerInstance);

export default CanvasWorkerProxy;
