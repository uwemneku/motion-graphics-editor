import ScreenContextProvider from "../context/screenContext/provider";
import Screen from "./screen";
import Timeline from "./timeline";

export default function AppLayout() {
  return (
    <ScreenContextProvider>
      <div className="w-screen h-screen bg-black flex flex-col">
        <main className="flex-1 relative">
          <div className="absolute size-20 w-full backdrop-grayscale-100 z-50 pointer-events-none" />
          <Screen />
        </main>
        {/* ============ DIVIDER ================= */}
        <div className="h-5 bg-gray-600" />
        {/* ====================================== */}
        <div className="flex-[0.4]">
          <Timeline />
        </div>
      </div>
    </ScreenContextProvider>
  );
}
