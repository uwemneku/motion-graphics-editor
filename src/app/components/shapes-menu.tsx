import { type ReactNode } from "react";
import {
  FaRegCircle,
  FaRegImage,
  FaRegSquare,
  FaShapes,
} from "react-icons/fa6";
import { PiTextAaBold } from "react-icons/pi";
import type { NodeType } from "../../types";
import useTimeLine from "../hooks/useTimeLine";

function ShapePicker() {
  const createNode = useTimeLine((e) => e.createNode);

  function handleAddNode(shape: NodeType) {
    return function () {
      switch (shape) {
        case "image":
          break;

        default:
          createNode(shape);
          break;
      }
    };
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const imgSrc = event.target?.result;
        if (typeof imgSrc === "string") {
          createNode("image", { src: imgSrc });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="group relative">
      <FaShapes size={24} />
      <div className="absolute top-0 left-full hidden -translate-y-3 pl-5 group-hover:block">
        <div className="flex gap-3 rounded-full border bg-white px-3 py-1">
          {nodeData.map((e) => (
            <button
              className="relative rounded-full p-1 transition-transform hover:scale-[105%] hover:bg-black hover:text-white active:scale-95 hover:[&>svg]:scale-75"
              key={e.type}
              onClick={handleAddNode(e.type)}
            >
              {e.type === "image" && (
                <input
                  type="file"
                  className="absolute left-0 z-10 h-full w-full cursor-pointer bg-black opacity-0"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              )}
              {e.el}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const nodeData: { type: NodeType; el: ReactNode }[] = [
  { type: "text", el: <PiTextAaBold className="z-0" size={24} /> },
  { type: "circle", el: <FaRegCircle className="z-0" size={24} /> },
  { type: "square", el: <FaRegSquare className="z-0" size={24} /> },
  { type: "image", el: <FaRegImage className="z-0" size={24} /> },
];

export default ShapePicker;
