import { RxDimensions } from "react-icons/rx";
import { twMerge } from "tailwind-merge";
import useTimeLine from "../../hooks/useTimeLine";

function AspectRatioButton() {
  const aspectRatio = useTimeLine((e) => e.aspectRatio);
  const setAspectRatio = useTimeLine((e) => e.setAspectRatio);
  const setVideoDimensions = useTimeLine((e) => e.setVideoDimensions);
  const videoDimensions = useTimeLine((e) => e.videoDimensions);
  return (
    <div className="flex items-center gap-4">
      {(["width", "height"] as const).map((e) => {
        return (
          <div
            key={e}
            className="flex items-center gap-2 overflow-hidden rounded-md border-1 text-xs"
          >
            <p className="border-r bg-gray-600 p-1 text-white">{e[0]}</p>
            <input
              className="max max-w-[40px] font-bold outline-none"
              value={videoDimensions[e] || ""}
            />
          </div>
        );
      })}
      <div className="group relative">
        <RxDimensions color="black" />
        <div className="absolute top-0 hidden -translate-x-[calc(calc(100%-16px)/2)] -translate-y-[calc(100%)] py-2 group-hover:block">
          <ul className="flex cursor-pointer flex-col overflow-hidden rounded-md border border-black bg-white text-center">
            {dataList.map((e) => {
              const isActive = aspectRatio === e.aspectRatio;
              return (
                <button
                  key={e.label}
                  className={twMerge(
                    "px-2 py-2 text-xs text-black hover:bg-black hover:text-white active:[&>p]:scale-95",
                    isActive ? "bg-gray-700 text-white" : "",
                  )}
                  onClick={() => {
                    setAspectRatio(e.aspectRatio);
                    setVideoDimensions({ width: e.width, height: e.height });
                  }}
                >
                  <p>{e.label}</p>
                </button>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

const dataList: {
  label: string;
  width: number;
  height: number;
  aspectRatio: number;
}[] = [
  { label: "16:9", width: 1920, height: 1080, aspectRatio: 16 / 9 },
  { label: "9:16", width: 608, height: 1080, aspectRatio: 9 / 16 },
  { label: "1:1", width: 1080, height: 1080, aspectRatio: 1 / 1 },
  { label: "4:5", width: 864, height: 1080, aspectRatio: 4 / 5 },
];

export default AspectRatioButton;
