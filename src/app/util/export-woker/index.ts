import { expose } from "comlink";
import { config, FabricObject, Rect, StaticCanvas } from "fabric";
import gsap from "gsap";
import type { Node } from "konva/lib/Node";
import type { ShapeConfig } from "konva/lib/Shape";
import type { Vector2d } from "konva/lib/types";
import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_MEDIUM,
} from "mediabunny";
import type { KeyFrame, NodeType, TimeLineStore } from "../../../types";

const fabricPlugin: GSAPPlugin = {
  name: "fabric",
  init(
    target: object,

    values: Record<string, unknown>,
    // _tween: gsap.core.Tween,
    // _index: number,
    // _targets: object[]
  ) {
    if (!(target instanceof FabricObject)) return false; // only handle Konva nodes

    this._target = target as unknown as FabricObject;
    this._props = [];

    for (const p in values) {
      console.log({ p, target });

      const _p = p as keyof FabricObject;
      const start = target[_p] as number;
      const end = values[p] as number | string;
      let change: number | object = 0;

      if (typeof end === "number") {
        change = end - start;
      }

      // @ts-expect-error Need to check type definition for custom plugin
      this._props.push({ prop: p, start, end, change });
    }

    // mark layer for redraw on each tick
    // this._layer = target.getLayer();
  },
  render(ratio, data) {
    const t = data._target;
    const _data = data as unknown as {
      _props: Array<{
        prop: string;
        start: number | string;
        change: number | object;
      }>;
    };

    _data._props.forEach((obj) => {
      const _start = obj.start as number;
      const _change = obj.change as number;
      const newValue = _start + _change * ratio;
      t.set({ [obj.prop]: newValue });
      console.log(_start, newValue, data);
    });
    data._target.canvas?.requestRenderAll();
  },
};

gsap.registerPlugin(fabricPlugin);

self.document = {
  createElement: (args: string) => {
    console.log({ args });

    switch (args) {
      case "canvas":
        return new OffscreenCanvas(100, 100);
      case "img":
        return new Image();
      default:
    }
  },
};
self.window = {
  requestAnimationFrame: () => {},
};

export async function start_worker(
  videoDimensions: TimeLineStore["videoDimensions"],
  videoBoundaryPos: Vector2d,
  videoDuration: number,
  scale: number,
  nodes: {
    keyframe: KeyFrame[] | undefined;
    type: NodeType;
    init: ReturnType<Node<ShapeConfig>["getAttr"]>;
  }[],
  p: (progress: number) => void,
  exportQuality = 1,
  // _canvas: OffscreenCanvas,
) {
  // return;
  const output = new Output({
    target: new BufferTarget(), // Stored in memory
    format: new Mp4OutputFormat({}),
  });
  console.log("worker started");
  const width = videoDimensions.width * exportQuality;
  const height = videoDimensions.height * exportQuality;
  const videoCodec = await getFirstEncodableVideoCodec(
    output.format.getSupportedVideoCodecs(),
    {
      width: width,
      height: height,
    },
  );

  if (!videoCodec) {
    throw new Error("Your browser doesn't support video encoding.");
  }

  //
  //

  const v = new OffscreenCanvas(width, height);
  v.style = { width: `${width}px`, height: `${width}px` };
  v.width = width;
  v.height = height;
  v.hasAttribute = () => {};
  v.setAttribute = () => {};

  v.classList = {
    add: () => {},
  };

  config.configure({ devicePixelRatio: 1 });
  const canvas = new StaticCanvas(v);

  canvas.setWidth(width);
  canvas.setHeight(height);
  console.log({ canvas, width, height });
  canvas.renderAll();

  const demoImg = "https://konvajs.org/assets/yoda.jpg";

  let radius = 300;

  console.log({ demoImg });

  const imgBlob = await (await fetch(demoImg)).blob();
  const bitmapImage = await createImageBitmap(imgBlob);
  console.log({ bitmapImage });

  // const img = new FabricImage(bitmapImage, {
  //   dirty: true,
  //   left: 0,
  //   top: 0,
  //   angle: 0,
  //   clipPath: new Circle({
  //     objectCaching: false,
  //     radius: 30,
  //     originX: "center",
  //     originY: "center",
  //   }),
  // });

  // canvas.add(img);

  const rect = new Rect({
    width: width / 2,
    height: height / 2,
    left: 0,
    top: 0,
    stroke: "#ffffff",
    strokeWidth: width / 20,
    fill: "#00ff00",
    selectable: false,
    evented: false, // ignores mouse/touch
    hasControls: false, // no resize/rotate
    hoverCursor: "default",
  });
  canvas.add(rect);
  canvas.renderAll();

  //
  //
  const frameRate = 60;
  const canvasSource = new CanvasSource(v, {
    codec: videoCodec,
    bitrate: QUALITY_MEDIUM,
  });

  //

  const timline = gsap.timeline({
    paused: true,
    onUpdate: () => {
      canvas.renderAll.bind(canvas)();
    },
  });

  // return;

  try {
    //

    output.addVideoTrack(canvasSource, { frameRate });
    await output.start();
    //

    timline.to(rect, {
      duration: videoDuration,
      left: width - rect.width!,
      top: height - rect.height!,
      fill: "rgba(255,0,0,0.5)",
      strokeWidth: 0,
      fabric: {},
      ease: "none",

      onUpdate: () => {},
    });

    const TOTAL_DURATION = 10; // seconds
    const totalFrames = frameRate * TOTAL_DURATION;
    let droppedFrames = 0;
    const expectedFrameDuration = 1000 / frameRate; // ms

    for (let i = 1; i < totalFrames; i++) {
      const frameStart = performance.now();
      const timeStamp = (i / totalFrames) * TOTAL_DURATION;
      const progress = i / totalFrames;
      // rect.left()
      // rect.set({ left: rect.getX() + progress, top: rect.getY() + progress });
      // rect.setY(rect.getY() + progress);
      // rect.set({
      //   strokeWidth: (width / 20) * (1 - progress) + 1,
      // });
      timline.seek(timeStamp, false);
      // await new Promise((r) => setTimeout(r, 50));

      await canvasSource.add(timeStamp, 1 / frameRate);
      p(progress);
      const frameEnd = performance.now();
      const actualFrameDuration = frameEnd - frameStart;
      if (actualFrameDuration > expectedFrameDuration) {
        droppedFrames++;
        console.warn(
          `Frame drop detected at frame ${i}: took ${actualFrameDuration.toFixed(2)}ms (expected ${expectedFrameDuration.toFixed(2)}ms)`,
        );
      }
    }
    if (droppedFrames > 0) {
      console.warn(
        `Total dropped frames: ${droppedFrames} out of ${totalFrames}`,
      );
    }
    //
    canvasSource.close();
    await output.finalize();
    const videoBlob = new Blob([output.target.buffer!], {
      type: output.format.mimeType,
    });
    const resultVideo = URL.createObjectURL(videoBlob);
    return resultVideo;
  } catch (error) {
    console.error("Export failed", { error });
  }
}

const g = { start: start_worker };
export type WorkerAPI = typeof g;
expose(g);
