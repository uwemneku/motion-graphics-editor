import { produce } from "immer";
import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import {
  Circle,
  Layer,
  Stage,
  Transformer,
  type KonvaNodeEvents,
} from "react-konva";
import { useScreenContext } from "../context/screenContext/context";
import useTimeLine from "../hooks/useTimeLine";

function Screen() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<Konva.Circle>(null);
  const transforRef = useRef<Konva.Transformer>(null);
  const screenContext = useScreenContext();

  const addKeyFrame = useTimeLine((e) => e.addKeyFrame);
  const addNode = useTimeLine((e) => e.addNode);

  const handleStateSelector: KonvaNodeEvents["onClick"] = (e) => {
    const isClickable = e?.target?.getAttr<boolean>("isClickable");
    if (isClickable) {
      // transforRef?.current?.nodes([e.currentTarget!]);
      return;
    }
    transforRef?.current?.nodes([]);
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
          })
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
    <div className="h-full bg-green-400" ref={containerRef}>
      <Stage
        onClick={handleStateSelector}
        width={size.width}
        height={size.height}
        className=""
      >
        <Layer>
          <Circle
            radius={50}
            x={50}
            y={50}
            width={100}
            height={100}
            // fill="yellow"
            stroke="black"
            isClickable
            draggable
            onClick={(node) => {
              if (node && circleRef.current) {
                transforRef.current?.nodes([circleRef.current!]);
              }
            }}
            ref={(node) => {
              if (node) {
                node?.fill("rgba(0, 255, 0, 0.5)");
                circleRef.current = node;
                addNode(node, "circle");
              }
            }}
            onTransformEnd={(e) => {
              console.log({ e });
              const x = e.currentTarget?.x();
              const y = e?.currentTarget?.y();
              const scale = e?.currentTarget?.scale();

              addKeyFrame("circle", {
                animatable: {
                  // x,
                  // y,
                  scaleX: scale?.x,
                  scaleY: scale?.y,
                  // fill: "rgba(0, 0, 139, 1)",
                },
                id: crypto.randomUUID(),
                timeStamp: screenContext?.scrubPosition.current || 0,
              });
            }}
            onDragEnd={(e) => {
              console.log({ e });
              const x = e.currentTarget?.x();
              const y = e?.currentTarget?.y();
              const scale = e?.currentTarget?.scale();
              addKeyFrame("circle", {
                animatable: {
                  x,
                  y,
                  // scaleX: scale?.x,
                  // scaleY: scale?.y,
                },
                id: crypto.randomUUID(),
                timeStamp: screenContext?.scrubPosition.current || 0,
              });
            }}
          />
          <Transformer
            ref={transforRef}
            borderStroke="#000"
            borderStrokeWidth={3}
            anchorFill="#fff"
            anchorStroke="#000"
            anchorStrokeWidth={2}
            anchorSize={20}
            anchorCornerRadius={50}
          />
        </Layer>
      </Stage>
    </div>
  );
}

export default Screen;
