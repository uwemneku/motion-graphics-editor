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
  QUALITY_VERY_HIGH,
} from "mediabunny";
import type { KeyFrame, NodeType, TimeLineStore } from "../../../types";

export async function start(
  videoDimensions: TimeLineStore["videoDimensions"],
  videoBoundaryPos: Vector2d,
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
  // const scaleFactor = 0.5;
  const width = videoDimensions.width * exportQuality;
  const height = videoDimensions.height * exportQuality;
  //
  //
  const videoCodec = await getFirstEncodableVideoCodec(
    output.format.getSupportedVideoCodecs(),
    {
      width: width,
      height: height,
    },
  );

  let c: OffscreenCanvas;
  const timline = gsap.timeline({ paused: true });
  Konva.Util.createCanvasElement = () => {
    const canvas = new OffscreenCanvas(width, height);
    //@ts-expect-error knova will throw error if canvas has no style
    canvas.style = {};
    c = canvas;
    return canvas as unknown as HTMLCanvasElement;
  };
  const stage = new Konva.Stage({
    width: width,
    height: height,
  });
  const layer = new Konva.Layer();
  const rec = new Konva.Rect({ width: width, height: height, fill: "white" });
  layer.add(rec);

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
    timline.to(shape, { x: 200, duration: 5, delay: 2 }, 0);
  });
  console.log({ timline });

  // return;

  //
  stage.add(layer);
  try {
    if (!videoCodec) {
      throw new Error("Your browser doesn't support video encoding.");
    }
    //
    const frameRate = 60;
    const offScreenCanvas = stage.getLayers()[0].getCanvas()._canvas;
    const canvasSource = new CanvasSource(offScreenCanvas, {
      codec: videoCodec,
      bitrate: QUALITY_VERY_HIGH,
    });
    output.addVideoTrack(canvasSource, { frameRate });
    await output.start();
    //

    const TOTAL_DURATION = timline.duration(); // seconds
    const totalFrames = frameRate * TOTAL_DURATION;
    for (let i = 1; i < totalFrames; i++) {
      const timeStamp = (i / totalFrames) * TOTAL_DURATION;
      const progress = i / totalFrames;
      timline.seek(timeStamp);
      // const progress = gsap.parseEase("none")(i / totalFrames);
      // circles.forEach(({ c, x, y, distanceX, distanceY }) => {
      //   c.x(x + distanceX * progress);
      //   c.y(y + distanceY * progress);
      // });
      await canvasSource.add(timeStamp, 1 / frameRate);
      p(progress);
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

const g = { start };
export type WorkerAPI = typeof g;
expose(g);
