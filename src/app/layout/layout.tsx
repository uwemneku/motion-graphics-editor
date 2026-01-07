import type { EditorMode } from "@/types";
import gsap from "gsap";
import { useRef, type CSSProperties } from "react";
import Screen from "../features/canvas";
import ShapeControls from "../features/controls";
import LayersSideMenu from "../features/layers";
import ShapePicker from "../features/shapes/shapes-add-menu";
import FloatingTimeline from "../features/timeline/timeline";

const OFFSET = 40;
const initMode: EditorMode = "animate";
export default function AppLayout() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<HTMLDivElement>(null);
  const hasAnimatedToInitialPosition = useRef(false);

  function onEditorModeSwithc(mode: EditorMode) {
    const floatingTimelineHeight = (timelineRef.current?.clientHeight || 0) + 10;
    switch (mode) {
      case "animate":
        gsap.to(containerRef.current, {
          "--offset": floatingTimelineHeight,
          duration: 0.5,
          ease: "power2.out",
        });
        gsap.to(containerRef.current, {
          "--timeline-offset": "0%",
          duration: 0.5,
          ease: "power2.out",
        });
        break;
      case "design":
        // gsap.to(containerRef.current, {
        //   "--offset": OFFSET,
        //   duration: 0.5,
        //   ease: "power3.out",
        // });
        // gsap.to(containerRef.current, {
        //   "--timeline-offset": "-150%",
        //   duration: 0.5,
        //   ease: "power2.out",
        // });
        break;

      default:
        break;
    }
  }

  return (
    <div
      className="flex h-dvh max-h-dvh w-dvw flex-col overflow-y-hidden"
      style={{ "--offset": `${OFFSET}px`, "--timeline-offset": "-150%" } as CSSProperties}
      ref={(node) => {
        if (!hasAnimatedToInitialPosition.current) {
          containerRef.current = node;
          onEditorModeSwithc(initMode);
          hasAnimatedToInitialPosition.current = true;
        }
      }}
    >
      <div className="relative flex w-full flex-1">
        <aside className="absolute top-4 left-4 z-20 flex h-fit min-h-20 w-[200px] flex-col overflow-hidden rounded-2xl border border-gray-300 bg-white">
          <div className="min-h-[50px] flex-[0.2]"></div>
          <div className="min-h-[100px] flex-1">
            <LayersSideMenu />
          </div>
        </aside>
        <div className="relative flex h-full flex-1 flex-col">
          <main className="relative flex-1">
            <div className="relative h-full">
              <Screen />
            </div>
          </main>
        </div>
        <div className="absolute right-0 z-20 p-4">
          <ShapeControls />
        </div>
      </div>

      {/* TIMELINE FOOTER */}
      <div
        className={`absolute bottom-0 left-0 z-50 flex w-full -translate-y-(--timeline-offset) flex-col`}
        ref={timelineRef}
      >
        <div
          ref={shapesRef}
          className="bottom-0 left-1/2 z-50 mx-auto mb-3 flex w-fit items-center rounded-xl border-2 border-gray-300 bg-white"
        >
          <ShapePicker initiMode={initMode} onModeSwitch={onEditorModeSwithc} />
        </div>
        <div className="p-x-2 drop max-h-[200px] border-t border-t-gray-300">
          <FloatingTimeline />
        </div>
      </div>
    </div>
  );
}
