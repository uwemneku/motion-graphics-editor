import FloatingMenuWrapper from "../components/floating-menu-wrapper";
import LayersSideMenu from "../features/layers";
import Screen from "../features/screen";
import ShapePicker from "../features/shapes/shapes-menu";
import ExportFeature2 from "../molecules/v2";

export default function AppLayout() {
  return (
    <div className="flex h-[100dvh] w-[100dvw]">
      <aside className="flex flex-col border-r border-gray-300 bg-white p-2">
        <LayersSideMenu />
      </aside>
      <div className="relative flex h-full flex-1 flex-col">
        <main className="relative flex-1">
          <div className="relative h-full">
            {/* The div below was added to see if backdrop-xxxxxx css styling can be used to hide things that are outside the view area */}
            {/* <div className="absolute size-20 w-full backdrop-grayscale-100 z-50 pointer-events-none" /> */}

            <FloatingMenuWrapper className="absolute top-3 right-3 z-30">
              <ExportFeature2 />
            </FloatingMenuWrapper>
            <Screen />
            {/* <FabricSample /> */}
          </div>
        </main>
        <div className="mx-auto my-2 h-[48px] w-fit rounded-sm border p-2">
          <ShapePicker />
        </div>
        {/* <div className="relative z-20 min-h-[150px] border-t border-gray-900 bg-white">
          <Timeline />
        </div> */}
      </div>
    </div>
  );
}
