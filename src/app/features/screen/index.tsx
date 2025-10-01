import { selectShape } from "@/app/features/shapes/slice";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { produce } from "immer";
import type Konva from "konva";
import { motion } from "motion/react";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Layer, Rect, Stage, Transformer } from "react-konva";
import { useScreenContext } from "../../context/screenContext/context";
import AppShapes from "../shapes/shapes";

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
      <Stage
        onMouseDown={handleStageClick}
        width={size.width}
        height={size.height}
        className=""
        onWheel={handleWheel}
        // draggable
        onDragMove={(e) => {
          const ref = screenContext?.getScreenContainerRef();
          if (!ref) return;
          const left = initX * e.currentTarget.scale().x + e.currentTarget.x();
          ref?.style.setProperty("--left-width", `${left}px`);
          const right =
            size.width - (left + videoWidth * e.currentTarget.scale().x);
          ref?.style.setProperty("--right-width", `${right}px`);
          const top =
            initHeight * e.currentTarget.scale().y + e.currentTarget.y();
          ref?.style.setProperty("--top-height", `${top}px`);
          const bottom =
            size.height - (top + videoHeight * e.currentTarget.scale().y);
          ref?.style.setProperty("--bottom-height", `${bottom}px`);
        }}
        ref={(node) => {
          if (size.width === 0 || size.height === 0) return;
          screenContext?.setStageNode(node);
        }}
      >
        <Layer>
          <Rect
            fill={"#fff"}
            width={size.width}
            height={size.height}
            scale={{ x: 1, y: 1 }}
            x={0}
            y={0}
            ref={(node) => {
              if (size.width === 0 || size.height === 0) return;
              node?.cache();
            }}
            listening={false}
          />

          {screenNodes.map((id) => {
            return (
              <Fragment key={id}>
                <AppShapes
                  stageHeight={size.height}
                  stageWidth={size.width}
                  videoHeight={videoHeight}
                  videoWidth={videoWidth}
                  id={id}
                  key={id}
                  transformerRef={transferRef}
                />
              </Fragment>
            );
          })}

          <Rect
            stroke={"#000"}
            width={videoWidth}
            height={videoHeight}
            x={size.width / 2 - videoWidth / 2}
            y={size.height / 2 - videoHeight / 2}
            ref={(node) => {
              vidoeFrameRef.current = node;
              node?.cache();
            }}
            listening={false}
            id="video-boundary"
          />
        </Layer>
        <Layer
          ref={(node) => {
            if (!node) return;
            node.canvas._canvas.style.zIndex = "25";
          }}
        >
          <SelectShapeTransformer
            saveRef={function (node) {
              if (!node) return;
              transferRef.current = node;
              screenContext?.saveTransformNode(node);
            }}
          />
        </Layer>
      </Stage>
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
