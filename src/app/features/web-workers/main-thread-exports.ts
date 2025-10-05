import { wrap, type Remote } from "comlink";
import offscreenWorker from "./canvas-worker?worker";
import type { IOffscreenRenderer } from "./types";
const workerInstance = new offscreenWorker();
const canvasWorkerProxy = wrap<Remote<IOffscreenRenderer>>(workerInstance);

export default canvasWorkerProxy;
