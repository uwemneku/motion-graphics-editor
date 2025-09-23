import { expose } from "comlink";
import gsap from "gsap";
import Konva from "konva";
import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_VERY_HIGH,
} from "mediabunny";

export async function start(p: (progress: number) => void) {
  const output = new Output({
    target: new BufferTarget(), // Stored in memory
    format: new Mp4OutputFormat({}),
  });

  console.log("worker started");
  const scaleFactor = 1;
  const width = 3840 * scaleFactor;
  const height = 2160 * scaleFactor;
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
  //
  new Array(4000).fill(0).forEach((_, index) => {
    const c = new Konva.Circle({
      x: width / 2,
      y: height / 2,
      radius: (width / 2) * 0.1,
      // random fill

      fill: `hsl(${360 * Math.random()}, 100%, 50%)`,
      stroke: "black",
      strokeWidth: 1,
    });

    const newX = height * 0.5 - index * (width * (Math.random() * 0.1));
    const newY = height * 0.5 - index * (width * (Math.random() * 0.1));
    timline.to(
      c,
      {
        x: newX,
        y: newY,
        fill: `hsl(${360 * Math.random()}, 100%, 50%)`,
        // radius: (width / 2) * (Math.random() * 0.1 + 0.05),
        duration: 5,
        ease: "none",
      },
      0,
    );
    // const distanceX = newX - x;
    // const distanceY = newY - y;
    layer.add(c);
    // return { c, x, y, newX, newY, distanceX, distanceY };
  });
  //
  stage.add(layer);
  //
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
  console.timeEnd("export");
  const resultVideo = URL.createObjectURL(videoBlob);
  return resultVideo;
}

const g = { start };
export type WorkerAPI = typeof g;
expose(g);
