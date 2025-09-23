/// <reference lib="webworker" />
import { wrap } from "comlink";
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
import { BiExport } from "react-icons/bi";
import { IoCloudyNight } from "react-icons/io5";
import useTimeLine from "../hooks/useTimeLine";
import RendererWorker from "../util/export-woker/index?worker";

const worker = new RendererWorker();
const obj = wrap(worker);
function ExportFeature() {
  const timeline = useTimeLine((e) => e.timeline);
  const elements = useTimeLine((e) => e.nodes?.[e?.nodesIndex?.[0]]);

  const exportUsingWebWorker = async () => {
    const res = await obj.start();
    window.open(res, "_blank");

    // worker.onmessage = (e) => {
    //   console.log("message from worker", e.data);
    //   window.open(e.data, "_blank");
    // };
  };

  /* -------------------------------------------------------------------------- */
  const handleClick = async () => {
    const output = new Output({
      target: new BufferTarget(), // Stored in memory
      format: new Mp4OutputFormat({}),
    });
    // const offScreenCanvas = document.querySelectorAll("canvas")[2];
    const videoCodec = await getFirstEncodableVideoCodec(
      output.format.getSupportedVideoCodecs(),
      {
        width: 800,
        height: 400,
      },
    );
    const f = document.createElement("div");
    f.style.backgroundColor = "white";
    const stage = new Konva.Stage({
      width: 800,
      height: 400,
      container: f,
    });
    const layer = new Konva.Layer();
    const rec = new Konva.Rect({ width: 800, height: 400, fill: "white" });
    layer.add(rec);

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

    if (!videoCodec) {
      throw new Error("Your browser doesn't support video encoding.");
    }
    const offScreenCanvas = stage.getLayers()[0].getCanvas()._canvas;
    const canvasSource = new CanvasSource(offScreenCanvas, {
      codec: videoCodec,
      bitrate: QUALITY_VERY_HIGH,
    });
    const frameRate = 100;
    output.addVideoTrack(canvasSource, { frameRate });
    await output.start();

    //

    //
    console.log({ videoCodec });

    console.time("export");
    const TOTAL_DURATION = 10; // seconds
    const totalFrames = frameRate * TOTAL_DURATION;
    for (let i = 1; i < totalFrames; i++) {
      const progress = gsap.parseEase("none")(i / totalFrames);
      circles.forEach(({ c, x, y, distanceX, distanceY }) => {
        c.x(x + distanceX * progress);
        c.y(y + distanceY * progress);
      });
      await canvasSource.add((i / totalFrames) * TOTAL_DURATION, 1 / frameRate);
    }
    canvasSource.close();
    await output.finalize();
    const videoBlob = new Blob([output.target.buffer!], {
      type: output.format.mimeType,
    });
    const resultVideo = URL.createObjectURL(videoBlob);
    console.timeEnd("export");
    window.open(resultVideo, "_blank");
  };
  return (
    <div>
      <IoCloudyNight size={30} onClick={exportUsingWebWorker} />
      <BiExport size={24} onClick={handleClick} />
    </div>
  );
}

export default ExportFeature;
