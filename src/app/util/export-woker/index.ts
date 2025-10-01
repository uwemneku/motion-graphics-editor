import { expose } from "comlink";
import { Rect, StaticCanvas } from "fabric";
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

// self.document = {
//   createElement: (args: string) => {
//     console.log({ args });

//     switch (args) {
//       case "canvas":
//         return new OffscreenCanvas(100, 100);
//       case "img":
//         return new Image();
//       default:
//     }
//   },
// };
// self.window = {
//   requestAnimationFrame: () => {},
// };

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

  const _canvas = new OffscreenCanvas(width, height);
  _canvas.style = { width: `${width}px`, height: `${width}px` };
  _canvas.hasAttribute = () => {};
  _canvas.setAttribute = () => {};
  _canvas.classList = {
    add: () => {},
  };
  const canvas = new StaticCanvas(_canvas);
  // canvas.setWidth(width);
  // canvas.setHeight(height);
  console.log({ canvas, width, height });

  const demoImg = "https://konvajs.org/assets/yoda.jpg";

  let radius = 300;

  console.log({ demoImg });

  const imgBlob = await (await fetch(demoImg)).blob();
  const bitmapImage = await createImageBitmap(imgBlob);
  console.log({ bitmapImage });

  // const img = new FabricImage(bitmapImage, {});
  // console.log({ img });
  // img.set({
  //   dirty: true,
  //   left: 500,
  //   top: 500,
  //   angle: 0,
  // });
  // canvas.add(img);

  const rect = new Rect({
    width: 100,
    height: 100,
    left: 0,
    top: 0,
    stroke: "#ff00ff",
    strokeWidth: 10,
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
  const canvasSource = new CanvasSource(_canvas, {
    codec: videoCodec,
    bitrate: QUALITY_MEDIUM,
  });

  //

  const timline = gsap.timeline({
    paused: true,
  });

  // return;

  try {
    //

    output.addVideoTrack(canvasSource, { frameRate });
    await output.start();
    //

    const TOTAL_DURATION = videoDuration; // seconds
    const totalFrames = frameRate * 5;
    let droppedFrames = 0;
    const expectedFrameDuration = 1000 / frameRate; // ms
    for (let i = 1; i < totalFrames; i++) {
      const frameStart = performance.now();
      const timeStamp = (i / totalFrames) * TOTAL_DURATION;
      const progress = i / totalFrames;
      rect.setX(400 * progress);
      rect.setY(400 * progress);
      canvas.renderAll();
      // await new Promise((r) => setTimeout(r, 50));

      timline.seek(timeStamp, false);
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
