import { debounce } from "@/app/util";
import { proxy } from "comlink";
import { useEffect, useRef, useState } from "react";
import type { FrontendCallback } from "../web-workers/types";
import { useCanvasWorkerContext } from "./useCanvasContext";

export function FloatingHUDLabel() {
  const MOUSE_PADDING = 20;
  const [size, setSize] = useState<string>();
  const canvasContext = useCanvasWorkerContext();
  const hasAttachedListener = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMouseDown = useRef(false);
  //
  const onScalingEnd = useRef<FrontendCallback["object:scaling"]>(debounce(() => {}, 100));
  const onRotatingEnd = useRef<FrontendCallback["object:rotating"]>(debounce(() => {}, 100));

  if (!hasAttachedListener.current && canvasContext.hasInitializedWorker) {
    canvasContext.app?.addEventListener(
      "object:scaling",
      proxy((id: string, width: number, height: number) => {
        onScalingEnd.current(id, width, height);
        if (!isMouseDown.current) return;
        setSize(`${width.toFixed(0)} x ${height.toFixed(0)}`);
      }),
    );
    canvasContext.app?.addEventListener(
      "object:rotating",
      proxy((id: string, angle: number) => {
        onRotatingEnd.current(id, angle);
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
