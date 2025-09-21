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
import { useRef } from "react";
import { BiExport } from "react-icons/bi";

function ExportFeature2() {
  const c = Math.PI * 20 * 2;
  const ref = useRef<SVGCircleElement>(null);

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

    const timeline = gsap.timeline({ paused: true });
    new Array(200).fill(0).forEach(() => {
      const c = new Konva.Circle({
        x: 40 * Math.random() * 10,
        y: 40 * Math.random() * 10,
        radius: 20,
        // random fill

        fill: `hsl(${360 * Math.random()}, 100%, 50%)`,
        stroke: "black",
        strokeWidth: 1,
      });
      timeline.to(
        c,
        {
          x: 800 * Math.random(),
          y: 400 * Math.random(),
          fill: `hsl(${360 * Math.random()}, 100%, 50%)`,
          radius: 20 * Math.random() + 10,
          scaleX: 1 * (Math.random() + 0.5),
          scaleY: 1 * (Math.random() + 0.5),

          duration: 10,

          ease: "none",
        },
        0,
      );

      layer.add(c);
      return { c };
    });
    Konva.Image.fromURL("https://konvajs.org/assets/yoda.jpg", (image) => {
      image.setAttrs({
        x: 50,
        y: 50,
      });
      layer.add(image);
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
    const frameRate = 60;
    output.addVideoTrack(canvasSource, { frameRate });
    await output.start();

    //

    //

    console.time("gsap");
    const TOTAL_DURATION = timeline.duration(); // seconds
    const totalFrames = frameRate * TOTAL_DURATION;
    // wait for a short while to let the svg render
    await new Promise((r) => setTimeout(r, 2000));

    for (let i = 1; i < totalFrames; i++) {
      const progress = (i / totalFrames) * 100;
      if (ref.current) {
        ref.current.style.strokeDashoffset = `${((100 - progress) / 100) * c}`;
      }
      const timeStamp = (i / totalFrames) * TOTAL_DURATION;
      timeline.seek(timeStamp);
      //   const progress = gsap.parseEase("none")(i / totalFrames);
      await canvasSource.add(timeStamp, 1 / frameRate);
    }
    canvasSource.close();
    await output.finalize();
    const videoBlob = new Blob([output.target.buffer!], {
      type: output.format.mimeType,
    });
    const resultVideo = URL.createObjectURL(videoBlob);
    console.timeEnd("gsap");
    window.open(resultVideo, "_blank");
  };
  return (
    <div className="relative">
      <BiExport size={24} onClick={handleClick} color="red" />
      {/* Add an svg circle og width 24px */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute -top-[25%] -left-[25%] h-[150%] w-[150%] animate-spin"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="red"
          strokeWidth="2"
          strokeDasharray={Math.PI * 20 * 2}
          strokeDashoffset={c}
          ref={ref}
        />
      </svg>
    </div>
  );
}

export default ExportFeature2;
