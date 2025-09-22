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

self.onmessage = async function () {
  console.log("worker started");
  const width = 800 * 1;
  const height = 400 * 1;
  //
  const output = new Output({
    target: new BufferTarget(), // Stored in memory
    format: new Mp4OutputFormat({}),
  });
  //
  const videoCodec = await getFirstEncodableVideoCodec(
    output.format.getSupportedVideoCodecs(),
    {
      width: width,
      height: height,
    },
  );

  let c: OffscreenCanvas;
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
  const circles = new Array(200).fill(0).map(() => {
    const c = new Konva.Circle({
      x: 40 * Math.random() * 10,
      y: 40 * Math.random() * 10,
      radius: 20,
      // random fill

      fill: `hsl(${360 * Math.random()}, 100%, 50%)`,
      stroke: "black",
      strokeWidth: 1,
    });
    const x = c.x();
    const y = c.y();
    const newX = 800 * Math.random();
    const newY = 400 * Math.random();
    const distanceX = newX - x;
    const distanceY = newY - y;
    layer.add(c);
    return { c, x, y, newX, newY, distanceX, distanceY };
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

  console.time("export");
  const TOTAL_DURATION = 5; // seconds
  const totalFrames = frameRate * TOTAL_DURATION;
  for (let i = 1; i < totalFrames; i++) {
    const progress = gsap.parseEase("none")(i / totalFrames);
    circles.forEach(({ c, x, y, distanceX, distanceY }) => {
      c.x(x + distanceX * progress);
      c.y(y + distanceY * progress);
    });
    await canvasSource.add((i / totalFrames) * TOTAL_DURATION, 1 / frameRate);
  }
  //
  canvasSource.close();
  await output.finalize();
  const videoBlob = new Blob([output.target.buffer!], {
    type: output.format.mimeType,
  });
  console.timeEnd("export");
  const img = await c.convertToBlob({ type: "image/png", quality: 4 });
  const resultVideo = URL.createObjectURL(videoBlob);
  self.postMessage(resultVideo);
};
