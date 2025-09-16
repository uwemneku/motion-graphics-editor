import { produce } from "immer";
import type Konva from "konva";
import { Fragment, useEffect, useRef, useState } from "react";
import { Layer, Stage, Transformer, type KonvaNodeEvents } from "react-konva";
import useTimeLine from "../../hooks/useTimeLine";
import { BASE_URL } from "../../util/const";
import AppShapes from "./shapes";

function Screen() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const transforRef = useRef<Konva.Transformer>(null);

  const screenNodes = useTimeLine((e) => e.nodesIndex);

  const handleStateSelector: KonvaNodeEvents["onClick"] = (e) => {
    const isClickable = e?.target?.getAttr<boolean>("isClickable");
    if (isClickable) {
      // transforRef?.current?.nodes([e.currentTarget!]);
      return;
    }
    transforRef?.current?.nodes([]);
  };

  console.log(screenNodes);

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
    <div
      className="h-full bg-white"
      ref={containerRef}
      style={{ backgroundImage: `url(${BASE_URL}/grid.svg)` }}
    >
      <Stage
        onClick={handleStateSelector}
        width={size.width}
        height={size.height}
        className=""
      >
        <Layer>
          {screenNodes.map((id) => {
            return (
              <Fragment key={id}>
                <AppShapes id={id} transformerRef={transforRef} />
              </Fragment>
            );
          })}
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
