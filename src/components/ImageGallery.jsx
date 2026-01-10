import { useState, useRef } from 'react'

/**
 * ImageGallery Component
 * Horizontal scrolling gallery for recall product images
 */
function ImageGallery({ images }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const scrollRef = useRef(null)

  if (!images || images.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>No images available</span>
      </div>
    )
  }

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }

  return (
    <>
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Product Images ({images.length})
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={scrollLeft}
              className="nav-btn"
              style={{ width: '28px', height: '28px', fontSize: '14px' }}
            >
              ◀
            </button>
            <button
              onClick={scrollRight}
              className="nav-btn"
              style={{ width: '28px', height: '28px', fontSize: '14px' }}
            >
              ▶
            </button>
          </div>
        </div>
        
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            paddingBottom: '8px',
            scrollbarWidth: 'thin'
          }}
        >
          {images.map((image, index) => {
            // Support both API (snake_case) and JSON (PascalCase) formats
            const imageUrl = image.URL || image.url
            const caption = image.Caption || image.caption
            
            return (
            <div
              key={index}
              onClick={() => {
                setSelectedIndex(index)
                setShowModal(true)
              }}
              style={{
                flexShrink: 0,
                width: '160px',
                height: '120px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: selectedIndex === index 
                  ? '2px solid var(--neon-cyan)' 
                  : '2px solid var(--glass-border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: selectedIndex === index 
                  ? '0 0 15px rgba(0, 240, 255, 0.3)' 
                  : 'none'
              }}
            >
              <img
                src={imageUrl}
                alt={caption || `Product image ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentNode.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:12px;">Image unavailable</div>'
                }}
              />
            </div>
          )
          })}
        </div>

        {(images[selectedIndex]?.Caption || images[selectedIndex]?.caption) && (
          <div style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: 'var(--text-secondary)',
            fontStyle: 'italic'
          }}>
            {images[selectedIndex].Caption || images[selectedIndex].caption}
          </div>
        )}
      </div>

      {/* Modal for enlarged image */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '40px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <img
              src={images[selectedIndex].URL || images[selectedIndex].url}
              alt={images[selectedIndex].Caption || images[selectedIndex].caption || 'Product image'}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
            {(images[selectedIndex].Caption || images[selectedIndex].caption) && (
              <div style={{
                position: 'absolute',
                bottom: '-40px',
                left: 0,
                right: 0,
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '14px'
              }}>
                {images[selectedIndex].Caption || images[selectedIndex].caption}
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedIndex(Math.max(0, selectedIndex - 1))
              }}
              style={{
                position: 'absolute',
                left: '-50px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ◀
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedIndex(Math.min(images.length - 1, selectedIndex + 1))
              }}
              style={{
                position: 'absolute',
                right: '-50px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ▶
            </button>
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default ImageGallery
