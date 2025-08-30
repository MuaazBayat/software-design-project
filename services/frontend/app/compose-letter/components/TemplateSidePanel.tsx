import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface TemplateSidePanelProps {
  open: boolean
  currentId?: string
  onSelect: (id: string | null) => void
  onPreview: (id: string | null) => void
  onClose: () => void
  anchorWithinSidebar?: boolean
  // optional: thumbnail line tile height to match the main editor's spacing
  thumbLineTile?: number
  // optional: thumbnail size override in px
  thumbSize?: number
}

// Minimal, self-contained template side panel used by RightSidebar.
export default function TemplateSidePanel({ open, onSelect, onPreview, onClose, anchorWithinSidebar, thumbLineTile, thumbSize }: TemplateSidePanelProps) {
  if (!open) return null

  const THUMB_LINE_TILE = thumbLineTile ?? 36 // fallback
  const THUMB_SIZE = thumbSize ?? 64

  // Map template IDs to the actual asset(s) found in the repo's templates folder.
  // Keep this list in sync with `app/compose-letter/templates`.
  const templates = [
    { id: 'lined', name: 'Line Page', preview: { type: 'lined', svg: '/compose-letter/templates/linedpage.svg' } }
  ]

  return (
    <div className={anchorWithinSidebar ? 'absolute left-0 top-0 w-full h-full bg-white/90 z-40 p-4' : 'fixed right-4 top-16 w-80 bg-white/90 z-40 p-4'}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">Templates</h3>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close templates">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <Card className="p-3 space-y-2">
        {templates.map(t => (
          <div key={t.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded border border-gray-200 overflow-hidden" aria-hidden style={{ width: THUMB_SIZE, height: THUMB_SIZE }}>
                {t.preview.type === 'lined' && (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#fffef8',
                    backgroundImage: `repeating-linear-gradient(180deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent ${THUMB_LINE_TILE}px), url('${t.preview.svg}')`,
                    backgroundRepeat: 'repeat, no-repeat',
                    backgroundSize: `100% ${THUMB_LINE_TILE}px, auto 100%`,
                    backgroundPosition: 'center top, center center'
                  }} />
                )}
                {t.preview.type === 'rustic' && (
                  <div style={{ width: '100%', height: '100%', background: `linear-gradient(180deg,#fbf6ec 0%,#f4efe6 100%)` }}>
                    <div style={{ width: '100%', height: '100%', backgroundImage: `url('${t.preview.svg}')`, backgroundRepeat: 'repeat', opacity: 0.25 }} />
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-gray-500">Sample background</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => onPreview(t.id)}>
                Preview
              </Button>
              <Button size="sm" onClick={() => onSelect(t.id)}>
                Apply
              </Button>
            </div>
          </div>
        ))}

        <div className="mt-2 pt-2 border-t border-gray-100">
          <Button size="sm" variant="outline" onClick={() => onSelect(null)} className="w-full">Clear Template</Button>
        </div>
      </Card>
    </div>
  )
}
