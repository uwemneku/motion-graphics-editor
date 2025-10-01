import { useAppSelector } from "@/app/store";
import { memo } from "react";

export const TimeStamp = memo(() => {
  const currentTime = useAppSelector((state) => state.timeline.currentTime);

  const minutes = Math.floor(currentTime / 60);
  const seconds = Math.floor(currentTime % 60);
  const milliseconds = Math.floor((currentTime % 1) * 100);
  //
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}:${String(milliseconds).padStart(2, "0")}`;
  return (
    <div>
      <p>{formattedTime}</p>
    </div>
  );
});
