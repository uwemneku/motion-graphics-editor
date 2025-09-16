import { TbHandMove } from "react-icons/tb";
import ShapePicker from "../components/shapes-picker";
import ScreenContextProvider from "../context/screenContext/provider";
import Screen from "./screen";
import Timeline from "./timeline";

export default function AppLayout() {
  return (
    <ScreenContextProvider>
      <div className="flex h-screen w-screen flex-col">
        <main className="relative flex-1">
          <div className="relative h-full">
            {/* The div below was added to see if backdrop-xxxxxx css styling can be used to hide things that are outside the view area */}
            {/* <div className="absolute size-20 w-full backdrop-grayscale-100 z-50 pointer-events-none" /> */}
            <div className="hover:border-brand absolute top-1/2 left-0 z-10 ml-3 flex -translate-y-1/2 flex-col gap-3 rounded-full border bg-white p-3">
              <ShapePicker />
              <TbHandMove size={24} />
            </div>
            <Screen />
          </div>
        </main>
        {/* ============ DIVIDER ================= */}
        <div className="h-5 bg-[#FF4500]" />
        {/* ====================================== */}
        <div className="flex-[0.4] bg-black">
          <Timeline />
        </div>
      </div>
    </ScreenContextProvider>
  );
}
