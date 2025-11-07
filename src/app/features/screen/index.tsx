import { proxy } from "comlink";
import { useCallback, useEffect, useRef, useState, type MouseEventHandler } from "react";
import { useCanvasWorkerContext } from "./canvas-worker-context";

function Screen() {
  const canvasContext = useCanvasWorkerContext();
  const app = canvasContext.app;
  const canvasNode = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isControlPressed = useRef(false);
  const isDragging = useRef(false);
  const dragDistance = useRef(dragInit);
  const isMoving = useRef(false);

  const registerWorker = async (node: HTMLCanvasElement) => {
    if (canvasNode.current) return;
    canvasNode.current = node;
    const height = node.clientHeight;
    const width = node.clientWidth;
    node.width = width * (window.devicePixelRatio || 1);
    node.height = height * (window.devicePixelRatio || 1);

    await canvasContext.initializeCanvasWorker(
      node,
      width,
      height,
      window.devicePixelRatio || 1,
      () => containerRef.current?.getBoundingClientRect(),
    );
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      console.log(e.key);

      switch (e.key) {
        case "Backspace":
        case "Delete":
          canvasContext.app?.deleteSelectedShapes();
          break;
      }
    },
    [canvasContext.app],
  );

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
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canvasContext, handleKeyDown, handleMouseMove, handleMouseUp]);

  return (
    <div
      className="relative h-full w-full bg-[#F5F5F5]"
      ref={containerRef}
      onMouseDown={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("mousedown", c);
      }}
      onMouseMove={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("mousemove", c);
      }}
      onMouseOut={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("mouseout", c);
      }}
      onMouseUp={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("mouseup", c);
      }}
      onWheel={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("wheel", c);
      }}
      onContextMenu={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("contextmenu", c);
      }}
      onMouseEnter={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("mouseenter", c);
      }}
      onClick={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("click", c);
      }}
      onDoubleClick={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("dblclick", c);
      }}
      onDrag={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("drag", c);
      }}
      onDragEnd={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("dragend", c);
      }}
      onDragEnter={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("dragenter", c);
      }}
      onDragLeave={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("dragleave", c);
      }}
      onDragOver={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("dragover", c);
      }}
      onDrop={(e) => {
        const c = removeFunctions(e);
        canvasContext.app?.handleMouseCallback("drop", c);
      }}
    >
      <FloatingSize />
      <canvas
        className="absolute z-10 h-full w-full"
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

const removeFunctions = (obj: MouseEvent, devicePixelRatio = window.devicePixelRatio) => {
  // extract all non-function properties from obj
  return {
    altKey: obj.altKey,
    button: obj.button,
    buttons: obj.buttons,
    clientX: (obj.clientX - 136) * devicePixelRatio,
    clientY: obj.clientY * devicePixelRatio,
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

function FloatingSize() {
  const MOUSE_PADDING = 20;
  const [size, setSize] = useState<string>();
  const canvasContext = useCanvasWorkerContext();
  const hasAttachedListener = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMouseDown = useRef(false);

  if (!hasAttachedListener.current && canvasContext.hasInitializedWorker) {
    canvasContext.app?.addEventListener(
      "object:scaling",
      proxy((width: number, height: number) => {
        if (!isMouseDown.current) return;
        setSize(`${width.toFixed(0)} x ${height.toFixed(0)}`);
      }),
    );
    canvasContext.app?.addEventListener(
      "object:rotating",
      proxy((angle: number) => {
        if (!isMouseDown.current) return;
        setSize(`${angle.toFixed(0)}°`);
      }),
    );
  }

  useEffect(() => {
    const handleMouseUp = () => {
      setSize(undefined);
      isMouseDown.current = false;
      ref.current?.style.setProperty("opacity", `0`);
    };

    const getInitialMousePosition = (e: MouseEvent) => {
      ref.current?.style.setProperty("left", `${e.pageX + MOUSE_PADDING}px`);
      ref.current?.style.setProperty("top", `${e.pageY + MOUSE_PADDING}px`);
      isMouseDown.current = true;
    };

    const moveIndicator = (e: MouseEvent) => {
      ref.current?.style.setProperty("left", `${e.pageX + MOUSE_PADDING}px`);
      ref.current?.style.setProperty("top", `${e.pageY + MOUSE_PADDING}px`);
      ref.current?.style.setProperty("opacity", `1`);
    };
    window.addEventListener("mousedown", getInitialMousePosition);
    window.addEventListener("mousemove", moveIndicator);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousedown", getInitialMousePosition);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", moveIndicator);
    };
  }, []);

  if (!size) return null;

  return (
    <div
      ref={ref}
      className="fixed z-20 min-w-[40px] rounded-full bg-blue-400 p-1 text-center text-[10px] font-semibold text-white opacity-0"
    >
      {size}
    </div>
  );
}

export default Screen;
