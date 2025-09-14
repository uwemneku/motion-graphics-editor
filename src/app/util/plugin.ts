import type {} from "gsap";
import Konva from "konva";

const KonvaPlugin: GSAPPlugin = {
  name: "konva",
  init(
    target: object,

    values: Record<string, unknown>
    // _tween: gsap.core.Tween,
    // _index: number,
    // _targets: object[]
  ) {
    if (!(target instanceof Konva.Node)) return false; // only handle Konva nodes

    this._target = target as unknown as Konva.Node;
    this._props = [];

    for (const p in values) {
      const _p = p as keyof Konva.Node;
      const start = target[_p]();
      const end = values[p] as number | string;
      let change: number | object = 0;

      if (typeof end === "number") {
        change = end - start;
      }
      if (typeof end === "string" && p === "fill") {
        const startColor = extractColorType(start);
        const endColor = extractColorType(end);
        change = {
          r: endColor.r - startColor.r,
          g: endColor.g - startColor.g,
          b: endColor.b - startColor.b,
          a: endColor.a - startColor.a,
        };
      }
      // @ts-expect-error Need to check type definition for custom plugin
      this._props.push({ prop: p, start, end, change });
    }

    // mark layer for redraw on each tick
    this._layer = target.getLayer();
  },
  render(ratio, data) {
    const t = data._target;
    const _data = data as unknown as {
      _props: Array<{
        prop: string;
        start: number | string;
        change: number | object;
      }>;
      _layer: Konva.Layer | null;
    };

    _data._props.forEach((obj) => {
      if (obj?.prop === "fill") {
        const startColor = extractColorType(obj.start?.toString());
        const _change = obj.change as {
          r: number;
          g: number;
          b: number;
          a: number;
        };
        const r = startColor.r + _change.r * ratio;
        const g = startColor.g + _change.g * ratio;
        const b = startColor.b + _change.b * ratio;
        const a = startColor.a + _change.a * ratio;
        t[obj.prop](`rgba(${r},${g},${b},${a})`);
        return;
      }
      const _start = obj.start as number;
      const _change = obj.change as number;
      t[obj.prop](_start + _change * ratio);
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
