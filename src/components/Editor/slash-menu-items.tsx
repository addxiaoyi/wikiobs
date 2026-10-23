import React from 'react'
import { Heading, Type, Code, Image, Video } from 'lucide-react'
import { BlockNoteEditor, BlockSpec, PartialBlock, PropSchema, insertOrUpdateBlock } from '@/lib/blocknote'
import { HMBlockSchema } from './schema'

const slashMenuItems = [
  {
    name: '标题 (Heading)',
    aliases: ['h', 'h1', 'h2', 'h3', 'heading', 'title', 'bt', 'biaoti'],
    group: '文本块 (Text)',
    icon: <Heading size={16} strokeWidth={1.8} className="text-[#a78bfa]" />,
    hint: '插入各级内容标题',
    execute: (editor: BlockNoteEditor<Record<string, BlockSpec<string, PropSchema>>>) => {
      insertOrUpdateBlock(editor, {
        type: 'heading',
        props: { level: '2' },
      } as PartialBlock<HMBlockSchema>)
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: '正文段落 (Paragraph)',
    aliases: ['p', 'zw', 'paragraph', 'text', 'zhengwen'],
    group: '文本块 (Text)',
    icon: <Type size={16} strokeWidth={1.8} className="text-slate-400" />,
    hint: '普通文字排版段落',
    execute: (editor: BlockNoteEditor<Record<string, BlockSpec<string, PropSchema>>>) => {
      insertOrUpdateBlock(editor, {
        type: 'paragraph',
      } as PartialBlock<HMBlockSchema>)
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: '代码块 (Code Block)',
    aliases: ['code', 'dm', 'daima', 'pre', 'code-block'],
    group: '文本块 (Text)',
    icon: <Code size={16} strokeWidth={1.8} className="text-emerald-400" />,
    hint: '高亮显示多行代码',
    execute: (editor: BlockNoteEditor<Record<string, BlockSpec<string, PropSchema>>>) => {
      insertOrUpdateBlock(editor, {
        type: 'code-block',
        props: {
          language: '',
        },
      } as PartialBlock<HMBlockSchema>)
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: '图片 (Image)',
    aliases: ['image', 'tp', 'tupian', 'img', 'picture', 'photo'],
    group: '媒体与外链 (Media)',
    icon: <Image size={16} strokeWidth={1.8} className="text-blue-400" />,
    hint: '嵌入本地或网络图像',
    execute: (editor: BlockNoteEditor<Record<string, BlockSpec<string, PropSchema>>>) => {
      insertOrUpdateBlock(
        editor,
        {
          type: 'image',
          props: {
            url: '',
            defaultOpen: 'true',
          },
        } as PartialBlock<HMBlockSchema>,
        true,
      )
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: '视频 (Video)',
    aliases: ['video', 'sp', 'shipin', 'vid', 'media'],
    group: '媒体与外链 (Media)',
    icon: <Video size={16} strokeWidth={1.8} className="text-pink-400" />,
    hint: '嵌入多媒体视频播放源',
    execute: (editor: BlockNoteEditor<Record<string, BlockSpec<string, PropSchema>>>) => {
      insertOrUpdateBlock(
        editor,
        {
          type: 'video',
          props: {
            url: '',
            defaultOpen: 'true',
          },
        } as PartialBlock<HMBlockSchema>,
        true,
      )
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
]

export default slashMenuItems
