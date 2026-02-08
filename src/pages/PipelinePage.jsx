import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PipelineCanvas } from '../components/pipeline'

/**
 * Pipeline Builder Page
 * Visual canvas for creating data import pipelines
 */
function PipelinePage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)

  const handleSave = useCallback(async (pipeline) => {
    setSaving(true)
    try {
      // TODO: Save pipeline to backend
      console.log('Saving pipeline:', pipeline)
      await new Promise(resolve => setTimeout(resolve, 500))
      // Show success message
    } catch (err) {
      console.error('Failed to save pipeline:', err)
    } finally {
      setSaving(false)
    }
  }, [])

  const handleRun = useCallback(async (pipeline) => {
    setRunning(true)
    try {
      // TODO: Execute pipeline via backend
      console.log('Running pipeline:', pipeline)
      await new Promise(resolve => setTimeout(resolve, 2000))
      // Show results
    } catch (err) {
      console.error('Failed to run pipeline:', err)
    } finally {
      setRunning(false)
    }
  }, [])

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-primary)'
    }}>
      <PipelineCanvas
        pipelineName="New Import Pipeline"
        onSave={handleSave}
        onRun={handleRun}
      />
    </div>
  )
}

export default PipelinePage
