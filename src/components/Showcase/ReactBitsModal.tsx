import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import ReactBitsShowcase from './ReactBitsShowcase'

export const ReactBitsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('wikiobs:open-reactbits-showcase', handleOpen)
    return () => window.removeEventListener('wikiobs:open-reactbits-showcase', handleOpen)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <DialogTitle className="sr-only">React Bits 组件展厅</DialogTitle>
        <ReactBitsShowcase />
      </DialogContent>
    </Dialog>
  )
}

export default ReactBitsModal
