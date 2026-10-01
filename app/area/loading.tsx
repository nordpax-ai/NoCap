import { LoadingIndicator } from "@/components/loading-indicator";

export default function AreaLoading() {
  return (
    <>
      <div className="progress-line" aria-hidden="true" />
      <LoadingIndicator />
    </>
  );
}
