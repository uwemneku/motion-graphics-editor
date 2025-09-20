import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from "mediabunny";
import { BiExport } from "react-icons/bi";
import { useScreenContext } from "../context/screenContext/context";
import useTimeLine from "../hooks/useTimeLine";

function ExportFeature() {
  const timeline = useTimeLine((e) => e.timeline);
  const screenContext = useScreenContext();

  /* -------------------------------------------------------------------------- */
  const handleClick = async () => {
    const stageNode = screenContext?.getStageNode();
    const image = stageNode?.toDataURL({ pixelRatio: 2 });
    const stageWidth = stageNode?.width() || 0;
    const stageHeight = stageNode?.height() || 0;
    if (!image) return;
    const f = URL.createObjectURL(await (await fetch(image)).blob());
    console.log({ f });

    const offScreenCanvas = stageNode?.toCanvas();

    const output = new Output({
      target: new BufferTarget(), // Stored in memory
      format: new Mp4OutputFormat(),
    });

    const videoCodec = await getFirstEncodableVideoCodec(
      output.format.getSupportedVideoCodecs(),
      {
        width: stageWidth,
        height: stageHeight,
        // bitrate: 80_000_000,
      },
    );

    if (!videoCodec) {
      throw new Error("Your browser doesn't support video encoding.");
    }
    const canvasSource = new CanvasSource(offScreenCanvas, {
      codec: videoCodec,
      bitrate: QUALITY_HIGH,
    });
    const frameRate = 30;
    output.addVideoTrack(canvasSource, { frameRate });
    await output.start();
    const ctx = offScreenCanvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high"; // "low" | "medium" | "high"
    timeline.eventCallback("onUpdate", (...args) => {
      console.log("onUpdate", ...args);
    });
    const totalDuration = timeline.duration();
    const totalFrames = totalDuration * frameRate;

    for (let i = 0; i < totalFrames; i++) {
      timeline.render(i / frameRate);
      const image = stageNode?.toDataURL({ pixelRatio: 4 });
      //   insert image into offScreenCanvas
      if (!image) continue;

      const img = await createImageBitmap(await (await fetch(image)).blob(), {
        resizeQuality: "high",
      });
      if (!ctx) continue;
      ctx.clearRect(0, 0, stageWidth, stageHeight);
      ctx.drawImage(img, 0, 0, stageWidth, stageHeight);
      await canvasSource.add(i / frameRate);
    }

    canvasSource.close();
    await output.finalize();
    const videoBlob = new Blob([output.target.buffer!], {
      type: output.format.mimeType,
    });
    const resultVideo = URL.createObjectURL(videoBlob);
    console.log(resultVideo?.split("/"));
  };
  return <BiExport size={24} onClick={handleClick} />;
}

export default ExportFeature;
