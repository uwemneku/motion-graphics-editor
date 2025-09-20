import { TbHandMove } from "react-icons/tb";
import FloatingMenuWrapper from "../components/floating-menu-wrapper";
import ShapePicker from "../components/shapes-picker";
import ScreenContextProvider from "../context/screenContext/provider";
import useKeybinding from "../hooks/useKeybinding";
import ExportFeature from "../molecules/export-feature";
import Screen from "./screen";
import Timeline from "./timeline";

export default function AppLayout() {
  useKeybinding();
  return (
    <ScreenContextProvider>
      <div className="flex h-screen w-screen flex-col">
        <main className="relative flex-1">
          <div className="relative h-full">
            {/* The div below was added to see if backdrop-xxxxxx css styling can be used to hide things that are outside the view area */}
            {/* <div className="absolute size-20 w-full backdrop-grayscale-100 z-50 pointer-events-none" /> */}
            <FloatingMenuWrapper className="absolute top-1/2 left-0 ml-3 -translate-y-1/2">
              <ShapePicker />
              <TbHandMove size={24} />
            </FloatingMenuWrapper>
            <FloatingMenuWrapper className="absolute top-3 right-3">
              <ExportFeature />
            </FloatingMenuWrapper>
            <Screen />
          </div>
        </main>
        {/* ============ DIVIDER ================= */}
        {/* <div className="h-5 bg-[#FF4500]" /> */}
        {/* ====================================== */}
        <div className="flex-[0.4] bg-black">
          <Timeline />
        </div>
      </div>
    </ScreenContextProvider>
  );
}
