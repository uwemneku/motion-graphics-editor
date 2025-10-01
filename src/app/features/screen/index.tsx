import { selectShape } from "@/app/features/shapes/slice";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { Canvas, FabricImage, Rect } from "fabric";
import { produce } from "immer";
import type Konva from "konva";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Transformer } from "react-konva";
import { useScreenContext } from "../../context/screenContext/context";

function Screen() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const transferRef = useRef<Konva.Transformer>(null);
  const screenContext = useScreenContext();
  const dispatch = useAppDispatch();
  const screenNodes = useAppSelector((state) => state.shapes.ids);
  const aspecRatio = 16 / 9;
  const ref = useRef<HTMLDivElement>(null);

  const vidoeFrameRef = useRef<Konva.Rect>(null);

  const isPortraitDevice = size.height > size.width;
  const videoDimensionMaxHeight = size.height * 0.6;
  const videoDimensionMaxWidth = size.width * 0.8;
  let videoHeight = videoDimensionMaxHeight;
  let videoWidth = videoHeight * aspecRatio;
  const initX = (size.width - videoWidth) / 2;
  const initHeight = (size.height - videoHeight) / 2;
  if (isPortraitDevice) {
    videoWidth = videoDimensionMaxWidth;
    videoHeight = videoWidth / aspecRatio;
  }

  // center video
  const selectNode = (id: string | undefined) => {
    dispatch(selectShape(id));
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    // e.evt.preventDefault();

    const stage = screenContext?.getStageNode();
    if (!stage) return;
    e.evt.preventDefault();

    // Trackpad two-finger scroll → pan
    if (!e.evt.ctrlKey) {
      stage.x(stage.x() - e.evt.deltaX);
      stage.y(stage.y() - e.evt.deltaY);

      stage.batchDraw();
    } else {
      // Trackpad pinch zoom (ctrlKey true) → zoom
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition() || { x: 0, y: 0 };
      const scaleBy = 1.05;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

      const mousePointTo = {
        x: pointer.x / oldScale - stage.x() / oldScale,
        y: pointer.y / oldScale - stage.y() / oldScale,
      };

      stage.scale({ x: newScale, y: newScale });

      const newPos = {
        x: -(mousePointTo.x - pointer.x / newScale) * newScale,
        y: -(mousePointTo.y - pointer.y / newScale) * newScale,
      };

      stage.position(newPos);
    }
    const ref = screenContext?.getScreenContainerRef();

    const leftWidth = Math.min(initX * stage.scale().x + stage.x());
    const rightWidth = size.width - (leftWidth + videoWidth * stage.scale().x);
    const topHeight = initHeight * stage.scale().y + stage.y();
    const bottomHeight =
      size.height - (topHeight + videoHeight * stage.scale().y);
    ref?.style.setProperty("--left-width", `${leftWidth}px`);
    ref?.style.setProperty("--right-width", `${rightWidth}px`);
    ref?.style.setProperty("--top-height", `${topHeight}px`);
    ref?.style.setProperty("--bottom-height", `${bottomHeight}px`);
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const isClickable = e?.target?.getAttr<boolean>("isClickable");
    console.log("stage clicked", isClickable, e.target, e.currentTarget);

    if (isClickable) {
      transferRef?.current?.nodes([e.target!]);
      selectNode(e.target?.getAttr<string>("id"));
      return;
    }
    transferRef?.current?.nodes([]);
    selectNode(undefined);
  };

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize(
          produce((draft) => {
            draft.width = width;
            draft.height = height;
          }),
        );
        screenContext?.fitStageToViewport();
      }
    });
    const screenContainerRef = screenContext?.getScreenContainerRef();
    if (screenContainerRef) resizeObserver.observe(screenContainerRef);
    return () => {
      resizeObserver.disconnect();
    };
  }, [screenContext]);
  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */
  return (
    <div
      className="relative h-full bg-white"
      ref={screenContext?.saveScreenContainerRef}
      style={
        {
          "--init-x": `${initX}px`,
          "--init-y": `${initHeight}px`,
          "--left-width": `${initX}px`,
          "--right-width": `${initX}px`,
          "--top-height": `${initHeight}px`,
          "--bottom-height": `${initHeight}px`,
        } as CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute top-0 z-20 bg-white opacity-75"
        style={{
          width: "calc(100% - var(--left-width) - var(--right-width))",
          height: "calc(var(--top-height))",
          left: "calc(var(--left-width))",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 z-20 bg-white opacity-75"
        style={{
          width: "calc(100% - var(--left-width) - var(--right-width))",
          height: "calc(var(--bottom-height))",
          left: "calc(var(--left-width))",
        }}
      />
      <motion.div
        className="pointer-events-none z-20 bg-white opacity-75"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "calc(var(--left-width))",
          height: size.height,
        }}
      />
      <motion.div
        className="pointer-events-none z-20 bg-white opacity-75"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "calc(var(--right-width))",
          height: size.height,
        }}
      />
      <motion.div
        ref={ref}
        className="pointer-events-none absolute top-0 left-0 z-20 h-full w-full"
      ></motion.div>
      <canvas
        width={size.width}
        height={size.height}
        className=""
        // draggable

        ref={async (node) => {
          if (size.width === 0 || size.height === 0 || !node) return;
          const canvas = new Canvas(node);
          const rect = new Rect({
            width: 500,
            height: 500,
            left: 0,
            top: 0,
            stroke: "#ff00ff",
            strokeWidth: 5,
            fill: "#00ff00",
            selectable: false,
            evented: false, // ignores mouse/touch
            hasControls: false, // no resize/rotate
            hoverCursor: "default",
          });

          const demoImg = "https://konvajs.org/assets/yoda.jpg";

          let radius = 300;

          console.log({ demoImg });

          // const image = new Image();
          // image.crossOrigin = "anonymous";
          // image.src = demoImg;

          // await new Promise((resolve) => {
          //   image.onload = () => {
          //     resolve(true);
          //   };
          // });
          const imgBlob = await (await fetch(demoImg)).blob();
          const bitmapImage = await createImageBitmap(imgBlob);
          console.log({ bitmapImage });
          const img = new FabricImage(bitmapImage, {});
          console.log({ img });
          img.set({
            dirty: true,
            left: 0,
            top: 0,
            angle: -15,
          });
          canvas.add(img);
          // canvas.add(rect);
          canvas.renderAll();
        }}
      ></canvas>
    </div>
  );
}

const SelectShapeTransformer = (props: {
  saveRef: (node: Konva.Transformer | null) => void;
}) => {
  const transforRef = useRef<Konva.Transformer>(null);
  const selectedNodeId = useAppSelector((state) => state.shapes.selectedNodeId);

  if (!selectedNodeId) {
    transforRef.current?.nodes([]);
  }

  return (
    <Transformer
      ignoreStroke
      ref={function (node) {
        if (node) {
          transforRef.current = node;
          props.saveRef(node);
        }
      }}
      borderStroke="#000"
      borderStrokeWidth={3}
      anchorFill="#fff"
      anchorStroke="#000"
      anchorStrokeWidth={2}
      anchorSize={10}
      anchorCornerRadius={0}
      anchorStyleFunc={(anchor) => {
        anchor.fill("#ffffff");
      }}
    />
  );
};

export default Screen;
