import FloatingMenuWrapper from "../components/floating-menu-wrapper";
import ShapePicker from "../components/shapes-menu";
import useKeybinding from "../hooks/useKeybinding";
import ExportFeature2 from "../molecules/v2";
import Screen from "./screen";
import Timeline from "./timeline";

export default function AppLayout() {
  useKeybinding();
  return (
    <div className="flex h-[100dvh] w-[100dvw] flex-col">
      <main className="relative flex-1">
        <div className="relative h-full">
          {/* The div below was added to see if backdrop-xxxxxx css styling can be used to hide things that are outside the view area */}
          {/* <div className="absolute size-20 w-full backdrop-grayscale-100 z-50 pointer-events-none" /> */}
          <FloatingMenuWrapper className="absolute top-1/2 left-0 z-30 ml-3 -translate-y-1/2 transition-all [&>svg]:hover:scale-95">
            <ShapePicker />
          </FloatingMenuWrapper>
          <FloatingMenuWrapper className="absolute top-3 right-3 z-30">
            <ExportFeature2 />
          </FloatingMenuWrapper>
          <Screen />
        </div>
      </main>
      <div className="relative z-20 min-h-[200px] border-t border-gray-900 bg-white">
        <Timeline />
      </div>
    </div>
  );
}
