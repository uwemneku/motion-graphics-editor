import type { EditorMode } from "@/types";
import gsap from "gsap";
import { useRef } from "react";
import FloatingMenuWrapper from "../components/floating-menu-wrapper";
import LayersSideMenu from "../features/layers";
import Screen from "../features/screen";
import ShapePicker from "../features/shapes/shapes-menu";
import FloatingTimeline from "../features/timeline/timeline";
import ExportFeature2 from "../molecules/v2";

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
        gsap.to(containerRef.current, {
          "--offset": OFFSET,
          duration: 0.5,
          ease: "power3.out",
        });
        gsap.to(containerRef.current, {
          "--timeline-offset": "-150%",
          duration: 0.5,
          ease: "power2.out",
        });
        break;

      default:
        break;
    }
  }

  return (
    <div
      className="flex h-[100dvh] max-h-dvh w-[100dvw] flex-col overflow-y-hidden"
      style={{ "--offset": `${OFFSET}px`, "--timeline-offset": "-150%" }}
      ref={(node) => {
        if (!hasAnimatedToInitialPosition.current) {
          containerRef.current = node;
          onEditorModeSwithc(initMode);
          hasAnimatedToInitialPosition.current = true;
        }
      }}
    >
      <div className="flex w-full flex-1">
        <aside className="flex w-full max-w-[200px] flex-col border border-gray-800 bg-white py-2">
          <div className="flex-[0.2]"></div>
          <div className="flex-1">
            <LayersSideMenu />
          </div>
        </aside>
        <div className="relative flex h-full flex-1 flex-col">
          <main className="relative flex-1">
            <div className="relative h-full">
              <FloatingMenuWrapper className="absolute top-3 right-3 z-30">
                <ExportFeature2 />
              </FloatingMenuWrapper>
              <Screen />
            </div>
          </main>
        </div>
      </div>

      {/* TIMELINE FOOTER */}
      <div>
        <div
          ref={shapesRef}
          className="absolute bottom-0 left-1/2 z-20 flex -translate-y-[var(--offset)] items-center rounded-xl border-2 border-gray-300 bg-white"
        >
          <ShapePicker initiMode={initMode} onModeSwitch={onEditorModeSwithc} />
        </div>
        <div
          className={`p-x-2 drop absolute bottom-0 left-0 z-10 flex max-h-[200px] min-h-[150px] w-full -translate-y-[var(--timeline-offset)] flex-col overflow-hidden border-t border-t-gray-300`}
          ref={timelineRef}
        >
          <FloatingTimeline />
        </div>
      </div>
    </div>
  );
}
