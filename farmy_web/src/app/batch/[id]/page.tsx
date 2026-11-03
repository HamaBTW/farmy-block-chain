import { Suspense } from "react";
import { JourneyScreen } from "./JourneyScreen";

export default function BatchPage() {
  return (
    <Suspense>
      <JourneyScreen />
    </Suspense>
  );
}
