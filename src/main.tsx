import gsap from "gsap";
import Konva from "konva";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const KonvaPlugin: typeof MotionPathPlugin = {
  name: "konva",
  init(
    target,
    values: object,
    tween: gsap.core.Tween,
    index: number,
    targets: object[]
  ) {
    if (!(target instanceof Konva.Node)) return false; // only handle Konva nodes
    console.debug({ values });

    this._target = target;
    this._props = [];

    for (const p in values) {
      let start = target[p]();
      let end = values[p];
      this._props.push({ prop: p, start, end, change: end - start });
    }

    // mark layer for redraw on each tick
    this._layer = target.getLayer();
  },
  render(ratio, data) {
    let t = data._target;
    data._props.forEach((obj) => {
      t[obj.prop](obj.start + obj.change * ratio);
    });

    if (data._layer) {
      data._layer.batchDraw();
    }
  },
};

gsap.registerPlugin(KonvaPlugin);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
