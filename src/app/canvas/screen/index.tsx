import { produce } from "immer";
import type Konva from "konva";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  Layer,
  Rect,
  Stage,
  Transformer,
  type KonvaNodeEvents,
} from "react-konva";
import { useScreenContext } from "../../context/screenContext/context";
import useTimeLine from "../../hooks/useTimeLine";
import AppShapes from "./shapes";

const MIN_SCALE = 0.05;
const MAX_SCALE = 4;
function Screen() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const transforRef = useRef<Konva.Transformer>(null);
  const screenContext = useScreenContext();

  const screenNodes = useTimeLine((e) => e.nodesIndex);
  const selectNode = useTimeLine((e) => e.selectNode);
  const videoDimensions = useTimeLine((e) => e.videoDimensions);

  const videoDimensionMaxHeight = size.height * 0.5;
  const videoHeight = Math.min(videoDimensions.height, videoDimensionMaxHeight);
  const videoAspectRatio = videoDimensions.width / videoDimensions.height;
  const videoWidth = videoHeight * videoAspectRatio;
  // center video
  const aspectRatioX = Math.max(100, size.width * 0.5 - videoWidth * 0.5);

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
      return;
    }

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
  };

  const handleStageClick: KonvaNodeEvents["onClick"] = (e) => {
    console.log("handleStageClick", { e: e.evt?.offsetX });

    const isClickable = e?.target?.getAttr<boolean>("isClickable");
    if (isClickable) {
      transforRef?.current?.nodes([e.target!]);
      selectNode(e.target?.getAttr<string>("id"));
      return;
    }
    transforRef?.current?.nodes([]);
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
      }
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="relative h-full bg-white" ref={containerRef}>
      <Stage
        onClick={handleStageClick}
        width={size.width}
        height={size.height}
        className=""
        onWheel={handleWheel}
        draggable
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
                  transformerRef={transforRef}
                />
              </Fragment>
            );
          })}

          <SelectShapeTransformer
            saveRef={(node) => {
              transforRef.current = node;
            }}
          />
          <Rect
            stroke={"#000"}
            width={videoWidth}
            height={videoHeight}
            x={aspectRatioX}
            y={size.height * 0.05}
            ref={(node) => {
              node?.cache();
            }}
            listening={false}
            id="video-boundary"
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
  const g = useTimeLine((r) => r.selectedNodeId);
  if (!g) {
    transforRef.current?.nodes([]);
  }

  return (
    <Transformer
      ref={(node) => {
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
