import { useAnimate, useMotionValue } from "motion/react";
import { useCallback, useEffect, useRef, type MouseEventHandler } from "react";
import { useCanvasWorkerContext } from "./canvas-worker-context";

function Screen() {
  const canvasContext = useCanvasWorkerContext();
  const app = canvasContext.app;
  const canvasNode = useRef<HTMLCanvasElement>(null);
  const [selectableDiv, animateTransformer] = useAnimate<HTMLDivElement>();
  const isControlPressed = useRef(false);
  const isDragging = useRef(false);
  const dragDistance = useRef(dragInit);
  const left = useMotionValue(0);
  const top = useMotionValue(0);
  const isMoving = useRef(false);

  const selectionAllowance = 0; // px

  const registerWorker = async (node: HTMLCanvasElement) => {
    if (canvasNode.current) return;
    canvasNode.current = node;
    const height = node.clientHeight;
    const width = node.clientWidth;

    const offscreenCanvas = node?.transferControlToOffscreen();
    await canvasContext.initializeCanvasWorker(
      offscreenCanvas,
      width,
      height,
      window.devicePixelRatio || 1,
    );
  };

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    isControlPressed.current = false;
    isMoving.current = false;
    app?.onMouseUp();
    isMoving.current = false;
  }, [app]);

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */
  const handleMouseMove: MouseEventHandler<HTMLDivElement> = useCallback(
    async (event) => {
      if (!isMoving.current) return;

      const dragData = dragDistance.current;
      const change = {
        x: event.clientX - dragData.startClientX,
        y: event.clientY - dragData.startClientY,
      };
      app?.onMouseMove(
        change,
        event.movementX,
        event.movementY,
        isControlPressed.current,
        event.shiftKey,
      );
      return;
      const { x, y } = getRelativeCoordinates(event);
      const changeRate = window.devicePixelRatio || 1;

      if (isControlPressed.current) {
        const xOrigin = 0.5;
        const yOrigin = 0.5;

        const lockYAxis =
          dragData.position === "center-left" || dragData.position === "center-right";
        const lockXAxis =
          dragData.position === "top-center" || dragData.position === "bottom-center";
        const reverseMouseYDirection = dragData.position === "center-right";
        const reverseMouseXDirection = dragData.position === "bottom-center";

        // indicates if a positive width value mean increase in width
        const isXPositive = dragData.position === "top-left" || dragData.position === "bottom-left";
        const isYPositive = dragData.position === "top-right" || dragData.position === "top-left";

        // calculate the distance moved from the initial click point
        const deltaX = lockXAxis
          ? 0
          : (event.clientX - dragData.startClientX) *
            changeRate *
            (reverseMouseYDirection ? -1 : 1);
        const deltaY = lockYAxis
          ? 0
          : (event.clientY - dragData.startClientY) *
            changeRate *
            (reverseMouseXDirection ? -1 : 1);

        // Calculate the scale factors
        const scaleX = (dragData.shapeWidth + -deltaX) / dragData.shapeWidth;
        const scaleY = (dragData.shapeHeight + -deltaY) / dragData.shapeHeight;

        // Width and height of the transformer shape
        const transformerWidth = dragData.shapeWidth + selectionAllowance;
        const transformerHeight = dragData.shapeHeight + selectionAllowance;

        const scaledTransformerWidth = ((dragData.xDirection || 0) + scaleX) * transformerWidth;
        const scaledTransformerHeight = ((dragData.yDirection || 0) + scaleY) * transformerHeight;

        // Determine if we need to flip the shape based on the direction of the drag
        // If the user drags past the original position, we flip the shape
        const shouldFlipX = isXPositive ? scaledTransformerWidth < 2 : scaledTransformerWidth > -2;
        const shouldFlipY = isYPositive
          ? scaledTransformerHeight < 2
          : scaledTransformerHeight > -2;

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
        const shapeScaleX = ((shouldFlipX ? 1 : -1) * scaledTransformerWidth) / transformerWidth;
        const shapeScaleY = ((shouldFlipY ? -1 : 1) * scaledTransformerHeight) / transformerHeight;

        await app?.transformShape(dragData.id, {
          scaleX: shapeScaleX,
          scaleY: shapeScaleY,
        });
        return;
      }
      if (isDragging.current) {
        const _x = left.get() + event.movementX;
        const _y = top.get() + event.movementY;
        left.set(_x);
        top.set(_y);
        await app?.transformShape(dragData.id, {
          xChange: event.movementX * changeRate,
          yChange: event.movementY * changeRate,
        });
      }
    },
    [animateTransformer, app, left, selectableDiv, top],
  );

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (canvasNode.current) {
          canvasContext.app?.fitCanvas(width, height);
        }
      }
    });
    if (canvasNode.current) {
      resizeObserver.observe(canvasNode.current);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [canvasContext, handleMouseMove, handleMouseUp]);

  return (
    <div
      className="relative h-full w-full"
      onMouseDown={async (event) => {
        dragDistance.current = {
          ...dragDistance.current,
          startClientX: event.clientX,
          startClientY: event.clientY,
        };
        const pos = getRelativeCoordinates(event);
        await canvasContext.app?.getShapeAtCoordinate(pos.x, pos.y);
        isControlPressed.current = true;

        return;
      }}
      onMouseUp={handleMouseUp}
      onMouseMove={() => {
        isMoving.current = true;
      }}
    >
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
  currentShapeWidth: 0,
  xDirection: 0,
  yDirection: 0,
  disableTranslateX: false,
  position: "top-left" as `${ITransformersData["yPosition"]}-${ITransformersData["xPosition"]}`,
  id: "",
  scale: {
    x: 1,
    y: 1,
  },
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
