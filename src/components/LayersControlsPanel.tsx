'use client'

import { useState } from 'react'
import LayerPanel from '@/components/LayerPanel'

export default function LayersControlsPanel() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="layers-controls-panel">
      <button
        className="layers-controls-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle layers panel"
        aria-expanded={isOpen}
        data-testid="testid-layers-toggle"
      >
        LAYERS
      </button>
      {isOpen && (
        <div className="layers-controls-content">
          <LayerPanel />
        </div>
      )}
    </div>
  )
}
