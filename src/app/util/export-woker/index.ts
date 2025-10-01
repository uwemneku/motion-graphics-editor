import { expose } from "comlink";
import gsap from "gsap";
import Konva from "konva";
import type { Node } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { Vector2d } from "konva/lib/types";
import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
} from "mediabunny";
import type { KeyFrame, NodeType, TimeLineStore } from "../../../types";

export async function startMain(
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

  const stage = new Konva.Stage({
    width: width,
    height: height,
    container: document.createElement("div"),
  });
  const layer = new Konva.Layer({ imageSmoothingEnabled: true });
  const rec = new Konva.Rect({ width: width, height: height, fill: "black" });
  layer.add(rec);
  //
  //
  const frameRate = 60;
  const offScreenCanvas = layer.getNativeCanvasElement();
  const canvasSource = new CanvasSource(offScreenCanvas, {
    codec: videoCodec,
    bitrate: QUALITY_HIGH,
  });
  console.log(
    "whidth",
    offScreenCanvas.width,
    "height",
    offScreenCanvas.height,
  );

  //

  const timline = gsap.timeline({
    paused: true,
  });

  nodes.forEach(({ keyframe, type, init }, index) => {
    if (!keyframe) return;
    let shape: Shape<ShapeConfig> | null = null;
    switch (type) {
      case "circle":
        shape = new Konva.Circle(init);
        break;
      case "square":
        shape = new Konva.Rect(init);
        break;
      case "rectangle":
        shape = new Konva.Rect(init);
        break;
      case "image":
        shape = new Konva.Image({
          image: init.image,
          ...init,
        });
        break;

      default:
        break;
    }
    if (!shape) return;
    layer.add(shape);
    keyframe.forEach((kf, index) => {
      if (!shape) return;
      let x = kf.animatable.x;
      let y = kf.animatable.y;
      if (kf.animatable.x) {
        x = (kf.animatable.x - videoBoundaryPos.x) * scale;
      }
      if (kf.animatable.y) {
        y = (kf.animatable.y - videoBoundaryPos.y) * scale;
      }
      const isFirstKeyFrame = index === 0;
      if (isFirstKeyFrame) {
        shape.setAttrs({
          ...kf.animatable,
          x,
          y,
        });
        return;
      }
      const prevKeyFrame = keyframe[index - 1];
      if (!prevKeyFrame) return;
      const duration = kf.timeStamp - prevKeyFrame.timeStamp;

      console.log({ duration });

      timline.to(
        shape,
        {
          ...kf.animatable,
          duration,
          ease: "none",
        },
        prevKeyFrame.timeStamp,
      );
    });
  });

  // return;

  //
  stage.add(layer);
  //

  output.addVideoTrack(canvasSource, { frameRate });
  await output.start();
  //

  const TOTAL_DURATION = videoDuration; // seconds
  const totalFrames = frameRate * TOTAL_DURATION;
  let droppedFrames = 0;
  const expectedFrameDuration = 1000 / frameRate; // ms
  for (let i = 1; i < totalFrames; i++) {
    const frameStart = performance.now();
    const timeStamp = (i / totalFrames) * TOTAL_DURATION;
    const progress = i / totalFrames;

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

  //
}
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
  let c: OffscreenCanvas;
  Konva.Util.createCanvasElement = () => {
    const canvas = new OffscreenCanvas(width, height);
    //@ts-expect-error knova will throw error if canvas has no style
    canvas.style = { width: `${width}px`, height: `${height}px` };
    c = canvas;
    return canvas as unknown as HTMLCanvasElement;
  };
  const stage = new Konva.Stage({
    width: width,
    height: height,
  });
  const layer = new Konva.Layer({ imageSmoothingEnabled: true });
  layer.getCanvas().setPixelRatio(1.5);
  console.log("ratio", layer.getCanvas().getPixelRatio());
  const rec = new Konva.Rect({ width: width, height: height, fill: "white" });
  layer.add(rec);
  //
  //
  const frameRate = 60;
  const offScreenCanvas = layer.getNativeCanvasElement();
  const canvasSource = new CanvasSource(offScreenCanvas, {
    codec: videoCodec,
    bitrate: QUALITY_MEDIUM,
  });

  //

  const timline = gsap.timeline({
    paused: true,
  });

  nodes.forEach(({ keyframe, type, init }, index) => {
    if (!keyframe) return;
    let shape: Shape<ShapeConfig> | null = null;
    switch (type) {
      case "circle":
        shape = new Konva.Circle(init);
        break;
      case "square":
        shape = new Konva.Rect(init);
        break;
      case "rectangle":
        shape = new Konva.Rect(init);
        break;
      case "text":
        shape = new Konva.Text(init);
        break;
      case "image":
        shape = new Konva.Image({
          image: init.image,
          ...init,
        });
        break;

      default:
        break;
    }
    if (!shape) return;
    layer.add(shape);
    shape.cache();
    keyframe.forEach((kf, index) => {
      if (!shape) return;
      if (kf.animatable.x) {
        kf.animatable.x = (kf.animatable.x - videoBoundaryPos.x) * scale;
      }
      if (kf.animatable.y) {
        kf.animatable.y = (kf.animatable.y - videoBoundaryPos.y) * scale;
      }
      const isFirstKeyFrame = index === 0;
      if (isFirstKeyFrame) {
        shape.setAttrs({
          ...kf.animatable,
        });
        return;
      }
      const prevKeyFrame = keyframe[index - 1];
      if (!prevKeyFrame) return;
      const duration = kf.timeStamp - prevKeyFrame.timeStamp;

      console.log({ duration });

      timline.to(
        shape,
        {
          ...kf.animatable,
          duration,
          ease: "none",
        },
        prevKeyFrame.timeStamp,
      );
    });
  });

  // return;

  //
  stage.add(layer);
  try {
    //

    output.addVideoTrack(canvasSource, { frameRate });
    await output.start();
    //

    const TOTAL_DURATION = videoDuration; // seconds
    const totalFrames = frameRate * TOTAL_DURATION;
    let droppedFrames = 0;
    const expectedFrameDuration = 1000 / frameRate; // ms
    for (let i = 1; i < totalFrames; i++) {
      const frameStart = performance.now();
      const timeStamp = (i / totalFrames) * TOTAL_DURATION;
      const progress = i / totalFrames;

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
  //
}
export async function start_v2(
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
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  // log out canvas details

  if (!ctx) return;

  //
  //
  const frameRate = 25;
  const canvasSource = new CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: QUALITY_VERY_HIGH,
  });
  //

  const timline = gsap.timeline({
    paused: true,
  });

  function createMovableCircle(
    ctx: OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
    borderColor = "black",
  ) {
    function drawCircle(cx: number, cy: number) {
      // paint background white
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // draw the circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.lineWidth = 10; // border thickness
      ctx.strokeStyle = borderColor;
      ctx.stroke();
    }

    // initial draw
    drawCircle(x, y);

    // return a function to move the circle
    return function moveCircle(newX: number, newY: number) {
      drawCircle(newX, newY);
    };
  }
  try {
    //

    output.addVideoTrack(canvasSource, { frameRate });
    await output.start();
    //

    const TOTAL_DURATION = videoDuration; // seconds
    const totalFrames = frameRate * TOTAL_DURATION;
    let droppedFrames = 0;
    const expectedFrameDuration = 1000 / frameRate; // ms
    const move = createMovableCircle(
      ctx,
      200,
      200,
      200,
      "rgba(0,225,0,1",
      "white",
    );

    for (let i = 1; i < totalFrames; i++) {
      const frameStart = performance.now();
      const timeStamp = i / frameRate;
      const progress = i / totalFrames;
      const changeRate = gsap.parseEase("none")(progress);
      const newPosX = 200 + changeRate * videoDimensions.width;
      const newPosY = 200 + changeRate * videoDimensions.height;
      move(newPosX, newPosY);

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
  //
}

const g = { start: start_worker };
export type WorkerAPI = typeof g;
expose(g);
