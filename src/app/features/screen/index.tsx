import { useAnimate, useMotionValue } from "motion/react";
import { useCallback, useEffect, useRef, type MouseEventHandler } from "react";
import { useCanvasWorkerContext } from "./canvas-worker-context";

function Screen() {
  const canvasContext = useCanvasWorkerContext();
  const app = canvasContext.app;
  const canvasNode = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
      () => containerRef.current?.getBoundingClientRect(),
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
    },
    [app],
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
      ref={containerRef}
      onMouseDown={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("mousedown", c);
      }}
      onMouseMove={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("mousemove", c);
      }}
      onMouseOut={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("mouseout", c);
      }}
      onMouseUp={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("mouseup", c);
        console.log("mouseup up", { c });
      }}
      onWheel={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("wheel", c);
      }}
      onContextMenu={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("contextmenu", c);
      }}
      onMouseEnter={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("mouseenter", c);
      }}
      onClick={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("click", c);
      }}
      onDoubleClick={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("dblclick", c);
      }}
      onDrag={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("drag", c);
      }}
      onDragEnd={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("dragend", c);
      }}
      onDragEnter={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("dragenter", c);
      }}
      onDragLeave={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("dragleave", c);
      }}
      onDragOver={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("dragover", c);
      }}
      onDrop={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleCallback("drop", c);
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

const removeFunctions = (obj: MouseEvent) => {
  // extract all non-function properties from obj
  return {
    altKey: obj.altKey,
    button: obj.button,
    buttons: obj.buttons,
    clientX: obj.clientX,
    clientY: obj.clientY,
    ctrlKey: obj.ctrlKey,
    metaKey: obj.metaKey,
    movementX: obj.movementX,
    movementY: obj.movementY,
    pageX: obj.pageX,
    pageY: obj.pageY,
    screenX: obj.screenX,
    screenY: obj.screenY,
    shiftKey: obj.shiftKey,
    type: obj.type,
    timeStamp: obj.timeStamp,
    // add more properties if needed
  };
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
