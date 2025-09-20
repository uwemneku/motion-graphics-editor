import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

function FloatingMenuWrapper(props: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={twMerge(
        "hover:border-brand z-10 flex flex-col gap-3 rounded-full border bg-white p-3",
        props.className,
      )}
    />
  );
}

export default FloatingMenuWrapper;
