import React, { lazy, Suspense } from 'react'

const CommandPalette = lazy(() => import('../CommandPalette/CommandPalette'))
const ReactBitsModal = lazy(() => import('../Showcase/ReactBitsModal'))

export const CommonModals: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <CommandPalette />
      <ReactBitsModal />
    </Suspense>
  )
}

export default CommonModals
