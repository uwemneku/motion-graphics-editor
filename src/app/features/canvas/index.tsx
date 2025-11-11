import { useAppDispatch } from "@/app/store";
import { proxy } from "comlink";
import { useCallback, useEffect, useRef, useState, type MouseEventHandler } from "react";
import { deleteShape } from "../shapes/slice";
import { useTimelineContext } from "../timeline/context/useTimelineContext";
import type { FilteredMouseEvent } from "../web-workers/types";
import { useCanvasWorkerContext } from "./useCanvasContext";

function Screen() {
  const canvasContext = useCanvasWorkerContext();
  const timelineContext = useTimelineContext();
  const app = canvasContext.app;
  const canvasNode = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightDiv = useRef<HTMLDivElement>(null);
  const isControlPressed = useRef(false);
  const isDragging = useRef(false);
  const isMoving = useRef(false);
  const dispatch = useAppDispatch();

  const registerWorker = async (node: HTMLCanvasElement, container: HTMLDivElement) => {
    if (canvasNode.current) return;
    canvasNode.current = node;
    containerRef.current = container;
    const height = node.clientHeight;
    const width = node.clientWidth;
    node.width = width * (window.devicePixelRatio || 1);
    node.height = height * (window.devicePixelRatio || 1);

    await canvasContext.initializeCanvasWorker(node, width, height, window.devicePixelRatio || 1, {
      containerRef: container,
    });
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      console.log(e.key);

      switch (e.key) {
        case "Backspace":
        case "Delete":
          canvasContext.app?.deleteSelectedShapes().then((ids) => {
            ids.forEach((id) => {
              dispatch(deleteShape(id));
            });
          });
          break;
        case " ":
          timelineContext.play();
          break;
      }
    },
    [canvasContext.app, dispatch, timelineContext],
  );

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
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canvasContext, handleKeyDown, handleMouseUp]);

  return (
    <div
      className="relative h-full w-full bg-[#F5F5F5]"
      // ref={containerRef}
      ref={(node) => {
        if (node && !canvasNode.current) {
          const canvas = node.getElementsByTagName("canvas")[0];
          registerWorker(canvas, node);
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
      onDoubleClick={registerMouseEvents("dblclick")}
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
  };
};

function FloatingHUDLabel() {
  const MOUSE_PADDING = 20;
  const [size, setSize] = useState<string>();
  const canvasContext = useCanvasWorkerContext();
  const hasAttachedListener = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMouseDown = useRef(false);

  if (!hasAttachedListener.current && canvasContext.hasInitializedWorker) {
    canvasContext.app?.addEventListener(
      "object:scaling",
      proxy((id: string, width: number, height: number) => {
        if (!isMouseDown.current) return;
        setSize(`${width.toFixed(0)} x ${height.toFixed(0)}`);
      }),
    );
    canvasContext.app?.addEventListener(
      "object:rotating",
      proxy((id: string, angle: number) => {
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
