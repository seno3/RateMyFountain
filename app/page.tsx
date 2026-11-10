import { Suspense } from "react";
import { getAllFountains } from "@/lib/data";
import { FountainStage } from "@/components/fountain3d/FountainStage";

export const metadata = { title: { absolute: "Boiler Fountains" } };

export default function HomePage() {
  return (
    // data-home switches the page to the monochrome theme and hides the global header (see globals.css).
    <div data-home>
      <Suspense fallback={<div className="h-svh bg-black" />}>
        <Stage />
      </Suspense>
    </div>
  );
}

async function Stage() {
  const fountains = await getAllFountains();
  const ratings = fountains.reduce((n, f) => n + f.rating_count, 0);
  return <FountainStage ratings={ratings} />;
}
