import React, { useEffect, useState } from 'react'
import { ArrowRight, Share2 } from 'lucide-react'
import '../../../styles/global.css'
import { HighlightData } from '@/components/Editor/HighlightExtension'

interface HighlightButtonProps {
  highlightData: HighlightData
  onClick: () => void
}
const HighlightButton: React.FC<HighlightButtonProps> = ({ highlightData, onClick }) => {
  const [showArrow, setShowArrow] = useState<boolean>(false)

  useEffect(() => {
    if (!highlightData.position) {
      setShowArrow(false)
    }
  }, [highlightData.position])

  if (!highlightData.position) {
    return null
  }

  const { top, left } = highlightData.position

  const handleClick = () => {
    onClick()
    setShowArrow(true)
  }

  return (
    <button
      onClick={handleClick}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="absolute flex size-7 cursor-pointer items-center justify-center rounded-full border border-border bg-popover text-foreground shadow-xl backdrop-blur-md transition-all duration-100 hover:border-[#7b68ee] hover:bg-[#7b68ee] hover:text-white hover:scale-110 active:scale-95"
      aria-label="关联图谱或笔记"
      type="button"
    >
      {showArrow ? <ArrowRight size={13} strokeWidth={2} /> : <Share2 size={13} strokeWidth={1.8} />}
    </button>
  )
}

export default HighlightButton
