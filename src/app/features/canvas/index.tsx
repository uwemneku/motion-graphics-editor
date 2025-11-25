import { useAppDispatch } from "@/app/store";
import { useCallback, useEffect, useRef, type MouseEventHandler } from "react";
import type { FilteredMouseEvent } from "../web-workers/types";
import { FloatingHUDLabel } from "./floating-hud-label";
import { useCanvasWorkerContext } from "./useCanvasContext";

function Screen() {
  const canvasContext = useCanvasWorkerContext();
  const app = canvasContext.app;
  const canvasNode = useRef<HTMLCanvasElement>(null);
  const upperCanvasNode = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightDiv = useRef<HTMLDivElement>(null);
  const isControlPressed = useRef(false);
  const isDragging = useRef(false);
  const isMoving = useRef(false);
  const dispatch = useAppDispatch();

  const registerWorker = async (
    node: HTMLCanvasElement,
    container: HTMLDivElement,
    upperCanvas: HTMLCanvasElement,
  ) => {
    if (canvasNode.current) return;
    canvasNode.current = node;
    containerRef.current = container;
    const height = node.clientHeight;
    const width = node.clientWidth;
    node.width = width * (window.devicePixelRatio || 1);
    node.height = height * (window.devicePixelRatio || 1);

    await canvasContext.initializeCanvasWorker(
      node,
      upperCanvas,
      width,
      height,
      window.devicePixelRatio || 1,
      {
        containerRef: container,
      },
    );
  };

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    isControlPressed.current = false;
    isMoving.current = false;
    app?.onMouseUp();
    isMoving.current = false;
  }, [app]);

  const registerMouseEvents =
    (type: keyof HTMLElementEventMap): MouseEventHandler<HTMLDivElement> =>
    (e) => {
      const offset = containerRef?.current?.getBoundingClientRect();
      const filteredEvents = filterMouseEventAttributes(e, devicePixelRatio, {
        x: offset?.left || 0,
        y: offset?.top || 0,
      });
      //@ts-expect-error filteredEvents are min properties needed from `TPointerEvent` for app to work
      canvasContext.app?.handleMouseCallback(type, filteredEvents);
    };

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

    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [canvasContext, handleMouseUp]);

  return (
    <div
      className="relative h-full w-full bg-[#F5F5F5]"
      data-container
      // ref={containerRef}
      ref={(node) => {
        if (node && !canvasNode.current) {
          const canvas = node.getElementsByTagName("canvas")[0];
          const upperCanvas = node.getElementsByTagName("canvas")[1];
          registerWorker(canvas, node, upperCanvas);
        }
      }}
      onMouseDown={registerMouseEvents("mousedown")}
      onMouseMove={registerMouseEvents("mousemove")}
      onMouseOut={registerMouseEvents("mouseout")}
      onMouseUp={registerMouseEvents("mouseup")}
      onWheel={registerMouseEvents("wheel")}
      onContextMenu={registerMouseEvents("contextmenu")}
      onMouseEnter={registerMouseEvents("mouseenter")}
      onClick={registerMouseEvents("click")}
      onDoubleClick={(...e) => {
        registerMouseEvents("dblclick")(...e);
      }}
      onDrag={registerMouseEvents("drag")}
      onDragEnd={registerMouseEvents("dragend")}
      onDragEnter={registerMouseEvents("dragenter")}
      onDragLeave={registerMouseEvents("dragleave")}
      onDragOver={registerMouseEvents("dragover")}
      onDrop={registerMouseEvents("drop")}
    >
      <FloatingHUDLabel />
      <div
        data-id="highlight rect"
        className="pointer-events-none absolute top-[var(--highlight-rect-top)] left-[var(--highlight-rect-left)] z-20 h-[var(--highlight-rect-height)] w-[var(--highlight-rect-width)] rotate-[var(--highlight-rect-angle)] border-2 border-blue-400"
        ref={highlightDiv}
      />

      <canvas className="absolute z-10 h-full w-full" />
      <canvas
        ref={upperCanvasNode}
        data-upper-canvas
        className="absolute z-15 h-full w-full"
        style={{ touchAction: "none" }}
      ></canvas>
    </div>
  );
}

const filterMouseEventAttributes = (
  obj: FilteredMouseEvent,
  devicePixelRatio = window.devicePixelRatio,
  offset = { x: 0, y: 0 },
) => {
  // extract all non-function properties from obj

  return {
    altKey: obj.altKey,
    button: obj.button,
    buttons: obj.buttons,
    clientX: (obj.clientX - offset.x) * devicePixelRatio,
    clientY: (obj.clientY - offset.y) * devicePixelRatio,
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
    detail: obj.detail,
  };
};

export default Screen;
