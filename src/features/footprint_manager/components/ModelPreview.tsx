import type { Footprint3DModelMetadata } from "../types";
import { ModelFailureDisplay, ModelPreviewCanvas } from "./model-preview/ModelPreviewCanvas";
import { useModelPreviewResource } from "./model-preview/useModelPreviewResource";

type Props = {
  meta: Footprint3DModelMetadata | null;
};

export default function ModelPreview({ meta }: Props) {
  const { supportedFormat, format, objectUrl, loading, error, info, failureMessage } = useModelPreviewResource(meta);
  console.log("ModelPreview render", { meta, supportedFormat, format, objectUrl, loading, error });

  if (!meta) {
    return <div className="p-6 text-sm text-slate-400">No 3D model selected</div>;
  }

  const showCanvas = Boolean(objectUrl && supportedFormat && !error);
  const showFailureCanvas = Boolean(!showCanvas && !loading && error);
  const showUnsupportedNotice = !showCanvas && !loading && !error;

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="relative w-full h-60 bg-slate-900/80 rounded-lg shadow-md overflow-hidden">
        {showCanvas && supportedFormat && objectUrl && (
          <ModelPreviewCanvas
            key={objectUrl}
            objectUrl={objectUrl}
            format={supportedFormat}
            failureMessage={failureMessage}
          />
        )}
        {showFailureCanvas && <ModelFailureDisplay message={failureMessage} />}
        {showUnsupportedNotice && (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-300">
            {failureMessage}
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-200 bg-slate-900/60">
            Loading model…
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{meta.name}</div>
          <div className="text-xs text-slate-400 mt-1">{meta.description || meta.footprintName || "No description"}</div>
          {info && <div className="text-[11px] text-cyan-200 mt-2">{info}</div>}
        </div>
        <div className="text-xs text-slate-500 text-right">
          <div>{meta.format ? meta.format.toUpperCase() : format ? format.toUpperCase() : "Unknown format"}</div>
          <div className="mt-2">{meta.category || "local"}</div>
        </div>
      </div>
    </div>
  );
}
