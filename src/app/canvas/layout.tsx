import type { EditorMode } from "@/types";
import gsap from "gsap";
import { useRef } from "react";
import FloatingMenuWrapper from "../components/floating-menu-wrapper";
import LayersSideMenu from "../features/layers";
import Screen from "../features/screen";
import ShapePicker from "../features/shapes/shapes-menu";
import FloatingTimeline from "../features/timeline/index-new";
import ExportFeature2 from "../molecules/v2";

const OFFSET = 40;
export default function AppLayout() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<HTMLDivElement>(null);

  const onEditorModeSwithc = (mode: EditorMode) => {
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
  };

  return (
    <div className="flex h-[100dvh] w-[100dvw]">
      <aside className="flex w-full max-w-[200px] flex-col border-r border-gray-300 bg-white py-2">
        <div className="flex-[0.2]"></div>
        <div className="flex-1">
          <LayersSideMenu />
        </div>
      </aside>
      <div
        ref={containerRef}
        style={{ "--offset": `${OFFSET}px`, "--timeline-offset": "-150%" }}
        className="relative flex h-full flex-1 flex-col"
      >
        <main className="relative flex-1">
          <div className="relative h-full">
            <FloatingMenuWrapper className="absolute top-3 right-3 z-30">
              <ExportFeature2 />
            </FloatingMenuWrapper>
            <Screen />
            {/* <FabricSample /> */}
          </div>
        </main>
        <div
          ref={shapesRef}
          className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 -translate-y-[var(--offset)] items-center rounded-xl border-2 border-gray-300 bg-white"
        >
          <ShapePicker onModeSwitch={onEditorModeSwithc} />
        </div>
        <div
          className={`p-x-2 drop absolute bottom-0 left-1/2 z-10 min-h-[100px] w-full -translate-x-1/2 -translate-y-[var(--timeline-offset)] overflow-hidden border-t border-t-gray-300 bg-white`}
          ref={timelineRef}
        >
          <FloatingTimeline />
        </div>
      </div>
    </div>
  );
}
