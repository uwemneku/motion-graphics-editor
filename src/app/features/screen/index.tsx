import { motion, useAnimate, useMotionValue } from "motion/react";
import { useEffect, useRef, type MouseEventHandler } from "react";
import { useCanvasWorkerContext } from "./canvas-worker-context";

function Screen() {
  const canvasContext = useCanvasWorkerContext();
  const canvasNode = useRef<HTMLCanvasElement>(null);
  const [selectableDiv, animateTransformer] = useAnimate<HTMLDivElement>();
  const isControlPressed = useRef(false);
  const isDragging = useRef(false);
  const dragDistance = useRef(dragInit);
  const left = useMotionValue(0);
  const top = useMotionValue(0);
  const width = useMotionValue(0);
  const height = useMotionValue(0);

  const selectionAllowance = 0; // px

  const registerWorker = async (node: HTMLCanvasElement) => {
    if (canvasNode.current) return;
    canvasNode.current = node;
    const height = node.clientHeight;
    const width = node.clientWidth;

    const offscreenCanvas = node?.transferControlToOffscreen();
    await canvasContext.init(offscreenCanvas, width, height, window.devicePixelRatio || 1);
  };

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */
  const resetTransformer = () => {
    animateTransformer(
      selectableDiv.current,
      {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        transform: "translate(0px, 0px)",
      },
      { duration: 0 },
    );
    dragDistance.current = dragInit;
  };

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */
  const handleMouseMove: MouseEventHandler<HTMLDivElement> = async (event) => {
    const { x, y } = getRelativeCoordinates(event);
    const dragData = dragDistance.current;
    if (isControlPressed.current) {
      const changeRate = window.devicePixelRatio || 1;
      const xOrigin = 0.5;
      const yOrigin = 0.5;

      const lockYAxis = dragData.position === "center-left" || dragData.position === "center-right";
      const lockXAxis = dragData.position === "top-center" || dragData.position === "bottom-center";
      const reverseMouseYDirection = dragData.position === "center-right";
      const reverseMouseXDirection = dragData.position === "bottom-center";

      // indicates if a positive width value mean increase in width
      const isXPositive = dragData.position === "top-left" || dragData.position === "bottom-left";
      const isYPositive = dragData.position === "top-right" || dragData.position === "top-left";

      // calculate the distance moved from the initial click point
      const deltaX = lockXAxis
        ? 0
        : (event.clientX - dragData.startClientX) * changeRate * (reverseMouseYDirection ? -1 : 1);
      const deltaY = lockYAxis
        ? 0
        : (event.clientY - dragData.startClientY) * changeRate * (reverseMouseXDirection ? -1 : 1);

      // Width and height of the transformer shape
      const transformerWidth = dragData.shapeWidth + selectionAllowance;
      const transformerHeight = dragData.shapeHeight + selectionAllowance;

      // Calculate the scale factors
      const scaleX = (dragData.shapeWidth + -deltaX) / dragData.shapeWidth;
      const scaleY = (dragData.shapeHeight + -deltaY) / dragData.shapeHeight;

      const scaledTransformerWidth = ((dragData.xDirection || 0) + scaleX) * transformerWidth;
      const scaledTransformerHeight = ((dragData.yDirection || 0) + scaleY) * transformerHeight;

      // Determine if we need to flip the shape based on the direction of the drag
      // If the user drags past the original position, we flip the shape
      const shouldFlipX = isXPositive ? scaledTransformerWidth < 2 : scaledTransformerWidth > -2;
      const shouldFlipY = isYPositive ? scaledTransformerHeight < 2 : scaledTransformerHeight > -2;

      const diffWidth = Math.abs(scaledTransformerWidth) - transformerWidth;
      const diffHeight = Math.abs(scaledTransformerHeight) - transformerHeight;

      const translateX = -diffWidth * xOrigin;
      const translateY = -diffHeight * yOrigin;

      // Animate the transformer div to reflect the new size and position
      animateTransformer(
        selectableDiv.current,
        {
          width: `${Math.abs(scaledTransformerWidth)}px`,
          height: `${Math.abs(scaledTransformerHeight)}px`,
          transform: `translate(${translateX}px, ${translateY}px) scaleX(${shouldFlipX ? -1 : 1}) scaleY(${shouldFlipY ? -1 : 1})`,
        },
        { duration: 0 },
      );
      await canvasContext.modifyShape(dragData.id, {
        scaleX: ((shouldFlipX ? 1 : -1) * scaledTransformerWidth) / transformerWidth,
        scaleY: ((shouldFlipY ? -1 : 1) * scaledTransformerHeight) / transformerHeight,
      });
      return;
    }
    if (isDragging.current) {
      // const _x = x - dragData.startX;
      // const _y = y - dragData.startY;
      // left.set(_x);
      // top.set(_y);
      // await canvasContext.modifyShape(dragData.id, { x: _x, y: _y });
    }
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (canvasNode.current) {
          canvasContext.onCanvasResize(width, height);
        }
      }
    });
    if (canvasNode.current) {
      resizeObserver.observe(canvasNode.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  }, [canvasContext]);

  return (
    <div
      className="relative h-full w-full"
      onMouseDown={async (event) => {
        const pos = getRelativeCoordinates(event);
        const shapeCoordinates = await canvasContext.getShapeUsingCoordinates(pos.x, pos.y);
        if (!shapeCoordinates) {
          resetTransformer();
          return;
        }
        left.set(shapeCoordinates.x - selectionAllowance / 2);
        top.set(shapeCoordinates.y - selectionAllowance / 2);
        width.set(shapeCoordinates.shapeWidth + selectionAllowance);
        height.set(shapeCoordinates.shapeHeight + selectionAllowance);
        isDragging.current = true;
        dragDistance.current = {
          ...dragDistance.current,
          startX: pos.x,
          startY: pos.y,
          offsetX: pos.x - shapeCoordinates.x,
          offsetY: pos.y - shapeCoordinates.y,
          startClientX: event.clientX,
          startClientY: event.clientY,
          id: shapeCoordinates.id,
          shapeWidth: shapeCoordinates.shapeWidth,
          shapeHeight: shapeCoordinates.shapeHeight,
        };
      }}
      onMouseUp={() => {
        isDragging.current = false;
        isControlPressed.current = false;
      }}
      onMouseMove={handleMouseMove}
    >
      {/* <div
        id="test"
        className="absolute top-[300px] left-[100px] z-50 h-[100px] w-[1000px] bg-red-500"
      /> */}
      <motion.div
        style={{ top, left, width, height }}
        className="absolute top-0 left-0 z-10 border-2 border-white"
        ref={selectableDiv}
      >
        {transformersData.map((e) => {
          const top = e.yPosition === "top" ? "0%" : e.yPosition === "center" ? "50%" : `100%`;
          const left = e.xPosition === "left" ? "0%" : e.xPosition === "center" ? "50%" : `100%`;
          return (
            <div
              key={`${e.yPosition}-${e.xPosition}`}
              style={{ top, left }}
              className="absolute size-[12px] -translate-1/2 rounded-full bg-white"
              onMouseDown={(event) => {
                event.currentTarget.style.backgroundColor = "lightgrey";
                isControlPressed.current = true;
                event.stopPropagation();
                dragDistance.current = {
                  ...dragDistance.current,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  xDirection: e.x || 0,
                  yDirection: e.y || 0,
                  disableTranslateX: e.disableTranslateX || false,
                  position: `${e.yPosition}-${e.xPosition}`,
                };
              }}
            />
          );
        })}
      </motion.div>
      <canvas
        className="absolute h-full w-full bg-black"
        ref={(node) => {
          if (node && !canvasNode.current) {
            registerWorker(node);
          }
        }}
      />
    </div>
  );
}

type ITransformersData = {
  allowedDirections?: ("x" | "y")[];
  x?: number;
  y?: number;
  yPosition: "top" | "center" | "bottom";
  xPosition: "left" | "center" | "right";
  disableTranslateX?: boolean;
};

const getRelativeCoordinates = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y };
};

const dragInit = {
  startClientX: 0,
  startClientY: 0,
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
  shapeHeight: 0,
  shapeWidth: 0,
  xDirection: 0,
  yDirection: 0,
  disableTranslateX: false,
  position: "top-left" as `${ITransformersData["yPosition"]}-${ITransformersData["xPosition"]}`,
  id: "",
};

const transformersData: ITransformersData[] = [
  {
    //top-left
    yPosition: "top",
    xPosition: "left",
  },
  {
    //top-center
    yPosition: "top",
    xPosition: "center",
    allowedDirections: ["x"],
  },
  {
    //top-right
    yPosition: "top",
    xPosition: "right",
    x: -2,
    disableTranslateX: true,
  },
  {
    //middle-left
    yPosition: "center",
    xPosition: "left",
    allowedDirections: ["y"],
  },
  {
    //middle-right
    yPosition: "center",
    xPosition: "right",
    allowedDirections: ["y"],
  },
  { y: -2, yPosition: "bottom", xPosition: "left" }, //bottom-left
  {
    //bottom-center
    yPosition: "bottom",
    xPosition: "center",
    allowedDirections: ["x"],
  },
  {
    //bottom-right
    yPosition: "bottom",
    xPosition: "right",
    x: -2,
    y: -2,
    disableTranslateX: true,
  },
];

export default Screen;
