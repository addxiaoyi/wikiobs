import { Editor } from '@tiptap/core'
import { Node as TipTapNode } from '@tiptap/pm/model'
import { EditorView } from '@tiptap/pm/view'
import { Block, BlockSchema } from '@/lib/blocknote'

export function youtubeParser(url: string) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[7].length === 11 ? match[7] : false
}

export function isValidUrl(urlString: string) {
  try {
    return Boolean(new URL(urlString))
  } catch (e) {
    return false
  }
}

export function camelToFlat(camel: string) {
  const camelCase = camel.replace(/([a-z])([A-Z])/g, '$1 $2')

  return camelCase
}

export const timeoutPromise = <T>(promise: Promise<T>, delay: number, reason?: unknown): Promise<T | null> =>
  new Promise<T | null>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (reason === undefined) resolve(null)
      else reject(reason)
    }, delay)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })

export function setGroupTypes(tiptap: Editor, blocks: Array<Partial<Block<BlockSchema>>>) {
  blocks.forEach((block: Partial<Block<BlockSchema>>) => {
    tiptap.state.doc.descendants((node: TipTapNode, pos: number) => {
      if (node.attrs.id === block.id && block.props && block.props.childrenType) {
        node.descendants((child: TipTapNode, childPos: number) => {
          if (child.type.name === 'blockGroup') {
            setTimeout(() => {
              if (tiptap.isDestroyed) return
              let { tr } = tiptap.state
              tr = block.props?.start
                ? tr.setNodeMarkup(pos + childPos + 1, null, {
                    listType: block.props?.childrenType,
                    listLevel: block.props?.listLevel,
                    start: parseInt(block.props?.start, 10),
                  })
                : tr.setNodeMarkup(pos + childPos + 1, null, {
                    listType: block.props?.childrenType,
                    listLevel: block.props?.listLevel,
                  })
              tiptap.view.dispatch(tr)
            })
            return false
          }
          return true
        })
      }
    })
    if (block.children) {
      setGroupTypes(tiptap, block.children)
    }
  })
}

export function getNodesInSelection(view: EditorView) {
  const { state } = view
  const { from, to } = state.selection
  const nodes: TipTapNode[] = []

  state.doc.nodesBetween(from, to, (node) => {
    if (node.type.name === 'blockContainer') {
      nodes.push(node)
    }
  })

  return nodes
}
