import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";

interface TemplateSidePanelProps {
  open: boolean;
  currentId?: string;
  onSelect: (id: string | null) => void;   // Apply
  onPreview: (id: string | null) => void;  // Live preview without closing
  onClose: () => void;
  anchorWithinSidebar?: boolean;           // ignored in bottom-sheet usage
  thumbLineTile?: number;                  // match editor line spacing
  thumbSize?: number;                      // px
}

type TemplateMeta = {
  id: string;
  name: string;
  kind: "lined" | "rustic" | "plain";
  description?: string;
};

const TEMPLATES: TemplateMeta[] = [
  { id: "lined",  name: "Lined Page", kind: "lined",  description: "Classic notebook lines" },
  // { id: "rustic", name: "Rustic",     kind: "rustic", description: "Warm textured paper" },
  // { id: "plain",  name: "Plain",      kind: "plain",  description: "Clean, minimal look" },
];

export default function TemplateSidePanel({
  open,
  currentId,
  onSelect,
  onPreview,
  onClose,
  thumbLineTile,
  thumbSize
}: TemplateSidePanelProps) {
  if (!open) return null;

  const THUMB_LINE_TILE = thumbLineTile ?? 36;
  const THUMB_SIZE = thumbSize ?? 96;

  const renderThumb = (kind: TemplateMeta["kind"]) => {
    if (kind === "lined") {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#fffef8",
            backgroundImage: `repeating-linear-gradient(180deg, rgba(0,0,0,0.055) 0px, rgba(0,0,0,0.055) 1px, transparent 1px, transparent ${THUMB_LINE_TILE}px)`,
            backgroundRepeat: "repeat",
            backgroundSize: `100% ${THUMB_LINE_TILE}px`,
            backgroundPosition: "center top",
          }}
        />
      );
    }
    if (kind === "rustic") {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(180deg,#fbf6ec 0%,#f4efe6 100%)",
          }}
        />
      );
    }
    // plain
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#fbf6ed",
        }}
      />
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-amber-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-amber-900">Templates</h3>
            <p className="text-xs text-amber-700/70">Pick a background, preview live, then apply.</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Close templates"
            className="text-amber-800 hover:bg-amber-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Current selection hint */}
        <div className="mb-3 text-xs text-gray-600">
          {currentId ? (
            <>Selected: <span className="font-medium text-amber-800">{TEMPLATES.find(t => t.id === currentId)?.name}</span></>
          ) : (
            <>No template selected</>
          )}
        </div>

        {/* Grid of templates */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {TEMPLATES.map((t) => {
            const selected = t.id === currentId;
            return (
              <Card
                key={t.id}
                className={`group p-3 border-amber-200 transition 
                ${selected ? "ring-2 ring-amber-400 border-amber-300" : "hover:border-amber-300"}`}
              >
                <div className="flex flex-col items-stretch gap-2">
                  <div
                    className="rounded-md overflow-hidden border border-amber-200 shadow-sm"
                    style={{ width: "100%", height: THUMB_SIZE }}
                    aria-hidden
                  >
                    {renderThumb(t.kind)}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-amber-900">{t.name}</div>
                      {t.description && (
                        <div className="text-[11px] text-amber-700/70">{t.description}</div>
                      )}
                    </div>
                    {selected && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-amber-200 hover:bg-amber-50"
                      onClick={() => onPreview(t.id)}
                    >
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => onSelect(t.id)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Clear */}
        <div className="mt-4">
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-amber-800 hover:bg-amber-100"
            onClick={() => onSelect(null)}
          >
            Clear Template
          </Button>
        </div>
      </div>
    </div>
  );
}
