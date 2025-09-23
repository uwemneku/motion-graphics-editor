import { TbZoom } from "react-icons/tb";
import FloatingMenuWrapper from "../components/floating-menu-wrapper";
import ShapePicker from "../components/shapes-menu";
import { useScreenContext } from "../context/screenContext/context";
import useKeybinding from "../hooks/useKeybinding";
import ExportFeature2 from "../molecules/v2";
import Screen from "./screen";
import Timeline from "./timeline";

export default function AppLayout() {
  const screenContext = useScreenContext();
  useKeybinding();
  return (
    <div className="flex h-screen w-screen flex-col">
      <main className="relative flex-1">
        <div className="relative h-full">
          {/* The div below was added to see if backdrop-xxxxxx css styling can be used to hide things that are outside the view area */}
          {/* <div className="absolute size-20 w-full backdrop-grayscale-100 z-50 pointer-events-none" /> */}
          <FloatingMenuWrapper className="absolute top-1/2 left-0 ml-3 -translate-y-1/2 transition-all [&>svg]:hover:scale-95">
            <ShapePicker />
            <TbZoom
              size={24}
              onClick={() => screenContext?.fitStageToViewport()}
            />
          </FloatingMenuWrapper>
          <FloatingMenuWrapper className="absolute top-3 right-3">
            <ExportFeature2 />
          </FloatingMenuWrapper>
          <Screen />
        </div>
      </main>
      {/* ============ DIVIDER ================= */}
      {/* <div className="h-5 bg-[#FF4500]" /> */}
      {/* ====================================== */}
      <div className="bg-whit absolute bottom-10 ml-[50%] h-[200px] w-2/3 -translate-x-1/2 rounded-md border border-gray-900 bg-white">
        <Timeline />
      </div>
    </div>
  );
}
