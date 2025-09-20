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

function Screen() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const transforRef = useRef<Konva.Transformer>(null);
  // const stageRef = useRef<Konva.Stage>(null);
  const screenContext = useScreenContext();

  const screenNodes = useTimeLine((e) => e.nodesIndex);
  const selectNode = useTimeLine((e) => e.selectNode);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    console.log("wheel", e.evt.deltaY);

    const stage = screenContext?.getStageNode();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition() || { x: 0, y: 0 };

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // how to scale? Zoom in? Or zoom out?
    let direction = e.evt.deltaY > 0 ? 1 : -1;

    // when we zoom on trackpad, e.evt.ctrlKey is true
    // in that case lets revert direction
    if (e.evt.ctrlKey) {
      direction = -direction;
    }

    const scaleBy = 1.01;
    const newScale = Math.max(
      0.5,
      Math.min(2, direction > 0 ? oldScale * scaleBy : oldScale / scaleBy),
    );

    stage.scale({ x: newScale, y: newScale });

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    containerRef.current?.style.setProperty("--scale", newScale.toString());
    stage.position(newPos);
  };

  const handleStateSelector: KonvaNodeEvents["onClick"] = (e) => {
    const isClickable = e?.target?.getAttr<boolean>("isClickable");
    if (isClickable) {
      transforRef?.current?.nodes([e.target!]);
      selectNode(e.target?.getAttr<string>("id"));
      return;
    }
    transforRef?.current?.nodes([]);
  };

  const handleCanvasClick: KonvaNodeEvents["onClick"] = (e) => {};

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
        onClick={handleStateSelector}
        width={size.width}
        height={size.height}
        className=""
        onWheel={handleWheel}
        ref={(node) => {
          screenContext?.setStageNode(node);
        }}
      >
        {/* Grid Layer - Behind all other content */}
        <Layer>
          <Rect
            fill={"#fff"}
            width={size.width}
            height={size.height}
            x={0}
            y={0}
          />
          <Rect
            stroke={"red"}
            width={size.width * 0.5}
            height={size.height * 0.5}
            x={size.width * 0.25}
            y={size.height * 0.25}
          />
        </Layer>
        {/* Main Content Layer */}
        <Layer>
          {screenNodes.map((id) => {
            return (
              <Fragment key={id}>
                <AppShapes id={id} transformerRef={transforRef} />
              </Fragment>
            );
          })}
          <SelectShapeTransformer
            saveRef={(node) => {
              transforRef.current = node;
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
