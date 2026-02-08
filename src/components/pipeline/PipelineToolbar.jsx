function PipelineToolbar({
  name,
  onNameChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToView,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onRun,
  onSave,
  onTogglePalette,
  isPaletteOpen
}) {
  const zoomPercent = Math.round(zoom * 100)

  return (
    <div className="pipeline-toolbar">
      <div className="pipeline-toolbar-left">
        <button 
          className="toolbar-btn"
          onClick={onTogglePalette}
          title={isPaletteOpen ? 'Hide node palette' : 'Show node palette'}
        >
          <i className={`fas ${isPaletteOpen ? 'fa-chevron-left' : 'fa-shapes'}`}></i>
        </button>
        
        <div className="toolbar-divider"></div>
        
        <button 
          className="toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
        >
          <i className="fas fa-undo"></i>
        </button>
        
        <button 
          className="toolbar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (⌘⇧Z)"
        >
          <i className="fas fa-redo"></i>
        </button>
      </div>

      <div className="pipeline-toolbar-center">
        <input
          type="text"
          className="pipeline-name-input"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Pipeline name..."
        />
      </div>

      <div className="pipeline-toolbar-right">
        <div className="zoom-controls">
          <button 
            className="toolbar-btn"
            onClick={onZoomOut}
            disabled={zoom <= 0.25}
            title="Zoom out"
          >
            <i className="fas fa-minus"></i>
          </button>
          
          <span 
            className="zoom-label"
            onClick={onZoomReset}
            style={{ cursor: 'pointer' }}
            title="Reset zoom"
          >
            {zoomPercent}%
          </span>
          
          <button 
            className="toolbar-btn"
            onClick={onZoomIn}
            disabled={zoom >= 2}
            title="Zoom in"
          >
            <i className="fas fa-plus"></i>
          </button>
          
          <button 
            className="toolbar-btn"
            onClick={onFitToView}
            title="Fit to view"
          >
            <i className="fas fa-expand"></i>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <button 
          className="toolbar-btn"
          onClick={onSave}
          title="Save pipeline"
        >
          <i className="fas fa-save"></i>
          <span>Save</span>
        </button>

        <button 
          className="toolbar-btn primary"
          onClick={onRun}
          title="Run pipeline"
        >
          <i className="fas fa-play"></i>
          <span>Run</span>
        </button>
      </div>
    </div>
  )
}

export default PipelineToolbar
