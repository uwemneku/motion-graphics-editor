import { wrap, type Remote } from "comlink";
import type { App } from "../shapes/app";
import offscreenWorker from "./canvas-worker?worker";
const workerInstance = new offscreenWorker();
const CanvasWorkerProxy = wrap<Remote<App>>(workerInstance);

export default CanvasWorkerProxy;
