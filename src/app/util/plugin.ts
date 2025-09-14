import type {} from "gsap";
import Konva from "konva";

const KonvaPlugin: GSAPPlugin = {
  name: "konva",
  init(
    target,
    values: object,
    _tween: gsap.core.Tween,
    _index: number,
    _targets: object[]
  ) {
    if (!(target instanceof Konva.Node)) return false; // only handle Konva nodes

    this._target = target;
    this._props = [];

    for (const p in values) {
      const start = target[p]();
      const end = values[p];

      let change: number | object = end - start;
      if (p === "fill") {
        const startColor = extractColorType(start);
        const endColor = extractColorType(end);
        change = {
          r: endColor.r - startColor.r,
          g: endColor.g - startColor.g,
          b: endColor.b - startColor.b,
          a: endColor.a - startColor.a,
        };
      }
      console.log({ p, start, end, change });
      this._props.push({ prop: p, start, end, change });
    }

    // mark layer for redraw on each tick
    this._layer = target.getLayer();
  },
  render(ratio, data) {
    const t = data._target;

    data._props.forEach((obj) => {
      if (obj?.prop === "fill") {
        const startColor = extractColorType(obj.start);
        const r = startColor.r + obj.change.r * ratio;
        const g = startColor.g + obj.change.g * ratio;
        const b = startColor.b + obj.change.b * ratio;
        const a = startColor.a + obj.change.a * ratio;
        t[obj.prop](`rgba(${r},${g},${b},${a})`);
        return;
      }
      t[obj.prop](obj.start + obj.change * ratio);
    });

    if (data._layer) {
      data._layer.batchDraw();
    }
  },
};

export default KonvaPlugin;

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
const extractColorType = (color: string) => {
  const [r = 0, g = 0, b = 0, a = 0] =
    color
      ?.replace("rgba(", "")
      .replace(")", "")
      .split(",")
      .map((e) => parseFloat(e.trim())) || [];
  return { r, g, b, a };
};
