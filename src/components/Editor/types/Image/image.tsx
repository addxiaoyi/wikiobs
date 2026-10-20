/* eslint react/destructuring-assignment: "off" */
import React, { useEffect, useRef, useState } from 'react'
import ResizeHandle from '@/components/Editor/ui/src/resize-handle'
import { Block, BlockNoteEditor, defaultProps, createReactBlockSpec } from '@/lib/blocknote'
import MediaContainer from '../media-container'
import { DisplayComponentProps, MediaRender, MediaType } from '../media-render'
import type { HMBlockSchema } from '../../schema'
import { useTranslation } from '@/lib/i18n'
import { isValidUrl } from '../utils'

const Display = ({ editor, block, selected, assign }: DisplayComponentProps) => {
  const [imageUrl, setImageUrl] = useState(block.props.url)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true)
      try {
        if (block.props.url?.startsWith('local://')) {
          const localImage = await window.fileSystem.getImage(block.props.url)
          if (localImage) {
            setImageUrl(localImage)
          }
        } else {
          setImageUrl(block.props.url)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadImage()
  }, [block.props.url])

  // Min image width in px.
  const minWidth = 64
  const width: number = parseFloat(block.props.width) || editor.domElement.firstElementChild!.clientWidth
  const [currentWidth, setCurrentWidth] = useState(width)
  const [showHandle, setShowHandle] = useState(false)
  const resizeParamsRef = useRef<
    | {
        handleUsed: 'left' | 'right'
        initialWidth: number
        initialClientX: number
      }
    | undefined
  >(undefined)

  const widthRef = useRef(width)

  useEffect(() => {
    if (block.props.width) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      widthRef.current = parseFloat(block.props.width)
      setCurrentWidth(parseFloat(block.props.width))
    }
  }, [block.props.width])

  useEffect(() => {
    const windowMouseMoveHandler = (event: MouseEvent) => {
      const resizeParams = resizeParamsRef.current
      if (!resizeParams) return

      const delta =
        resizeParams.handleUsed === 'left'
          ? resizeParams.initialClientX - event.clientX
          : event.clientX - resizeParams.initialClientX
      const nextWidth = resizeParams.initialWidth + delta * 2
      const editorWidth = editor.domElement.firstElementChild?.clientWidth ?? nextWidth
      const boundedWidth = Math.min(Math.max(nextWidth, minWidth), editorWidth)

      widthRef.current = boundedWidth
      setCurrentWidth(boundedWidth)
    }

    const windowMouseUpHandler = () => {
      setShowHandle(false)
      const resizeParams = resizeParamsRef.current
      if (!resizeParams) return
      resizeParamsRef.current = undefined

      const nextWidth = widthRef.current.toString()
      assign({
        id: block.id,
        props: {
          url: block.props.url,
          name: block.props.name,
          width: nextWidth,
        },
        children: [],
        content: [],
        type: 'image',
      })

      // @ts-expect-error
      editor.updateBlock(block.id, {
        ...block,
        props: {
          width: nextWidth,
        },
      })
    }

    window.addEventListener('mousemove', windowMouseMoveHandler)
    window.addEventListener('mouseup', windowMouseUpHandler)
    return () => {
      window.removeEventListener('mousemove', windowMouseMoveHandler)
      window.removeEventListener('mouseup', windowMouseUpHandler)
    }
  }, [assign, block, editor, minWidth])

  // Hides the resize handles when the cursor leaves the image
  const imageMouseLeaveHandler = () => {
    if (resizeParamsRef.current) {
      return
    }

    setShowHandle(false)
  }

  // Sets the resize params, allowing the user to begin resizing the image by
  // moving the cursor left or right.
  const leftResizeHandleMouseDownHandler = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()

    setShowHandle(true)

    resizeParamsRef.current = {
      handleUsed: 'left',
      initialWidth: widthRef.current || parseFloat(block.props.width),
      initialClientX: event.clientX,
    }
    editor.setTextCursorPosition(block.id, 'start')
  }

  const rightResizeHandleMouseDownHandler = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()

    setShowHandle(true)

    resizeParamsRef.current = {
      handleUsed: 'right',
      initialWidth: widthRef.current || parseFloat(block.props.width),
      initialClientX: event.clientX,
    }
    editor.setTextCursorPosition(block.id, 'start')
  }

  return (
    <MediaContainer
      editor={editor}
      block={block}
      mediaType="image"
      selected={selected}
      assign={assign}
      onHoverIn={() => {
        if (editor.isEditable) {
          setShowHandle(true)
        }
      }}
      onHoverOut={imageMouseLeaveHandler}
      width={currentWidth}
    >
      {showHandle && (
        <>
          <ResizeHandle left={4} onMouseDown={leftResizeHandleMouseDownHandler} />
          <ResizeHandle right={4} onMouseDown={rightResizeHandleMouseDownHandler} />
        </>
      )}
      {!isLoading && imageUrl && (
        <img
          style={{ width: `100%` }}
          src={imageUrl}
          alt={block.props.name || block.props.alt}
          contentEditable={false}
        />
      )}
    </MediaContainer>
  )
}

const Render = (block: Block<HMBlockSchema>, editor: BlockNoteEditor<HMBlockSchema>) => {
  const { t } = useTranslation()
  const submitImage = async (
    assignMedia: (props: MediaType) => void,
    queryType: string,
    url?: string,
    setErrorRaised?: (error: string) => void,
  ) => {
    if (queryType === 'upload') {
      const filePaths = await window.fileSystem.openImageFileDialog()

      if (filePaths && filePaths.length > 0) {
        const filePath: string = filePaths[0]
        const fileData = await window.fileSystem.readFile(filePath, 'base64')
        const imageData = `data:image/png;base64,${fileData}`

        const storedImageUrl = await window.fileSystem.storeImage(imageData, filePath, block.id)
        assignMedia({
          id: block.id,
          props: {
            url: storedImageUrl,
            name: filePath,
          },
          children: [],
          content: [],
          type: 'image',
        })
      }
    }

    if (url && isValidUrl(url)) {
      try {
        const response = await fetch(url)
        if (!response.ok) {
          setErrorRaised?.(t('media.imageFetchFailed'))
        }
        const blob = await response.blob()
        const reader = new FileReader()
        reader.onloadend = async () => {
          const imageData = reader.result as string
          const sanitizedURL = url.split('?')[0]
          const storedImageUrl = await window.fileSystem.storeImage(imageData, sanitizedURL, block.id)

          assignMedia({
            id: block.id,
            props: {
              url: storedImageUrl,
              name: url,
            },
            children: [],
            content: [],
            type: 'image',
          })
        }
        reader.readAsDataURL(blob)
      } catch (error) {
        setErrorRaised?.(t('media.imageFetchFailed'))
      }
    } else {
      setErrorRaised?.(t('media.invalidUrl'))
    }
  }

  return (
    <MediaRender
      block={block}
      hideForm={!!block.props.url}
      editor={editor}
      mediaType="image"
      submit={submitImage}
      DisplayComponent={Display}
    />
  )
}

const ImageBlock = createReactBlockSpec({
  type: 'image',
  propSchema: {
    ...defaultProps,
    url: {
      default: '',
    },
    alt: {
      default: '',
    },
    name: {
      default: '',
    },
    width: {
      default: '',
    },
    defaultOpen: {
      values: ['false', 'true'],
      default: 'false',
    },
  },
  containsInlineContent: true,

  render: ({ block, editor }: { block: Block<HMBlockSchema>; editor: BlockNoteEditor<HMBlockSchema> }) =>
    Render(block, editor),

  parseHTML: [
    {
      tag: 'img[src]',
      getAttrs: (element: HTMLElement) => {
        return {
          url: element.getAttribute('src'),
          width: element.getAttribute('width') || element.style.width,
          alt: element.getAttribute('alt') || '',
          name: element.getAttribute('title') || '',
        }
      },
      node: 'image',
    },
  ],
})

export default ImageBlock
