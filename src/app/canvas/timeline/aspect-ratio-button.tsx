import { RxDimensions } from "react-icons/rx";

function AspectRatioButton() {
  return (
    <div className="group relative">
      <RxDimensions color="black" />
      <div className="absolute top-0 hidden -translate-x-[calc(calc(100%-16px)/2)] -translate-y-[calc(100%-32px)] py-2 group-hover:block">
        <ul className="flex cursor-pointer flex-col gap-4 rounded-md border border-black bg-white p-2 text-center">
          <p className="text-xs text-black">16:9</p>
          <p className="text-xs text-black">9:16</p>
          <p className="text-xs text-black">1:1</p>
          <p className="text-xs text-black">4:3 </p>
          <p className="text-xs text-black">5:4</p>
        </ul>
      </div>
    </div>
  );
}

export default AspectRatioButton;
