import { Image, Video } from 'lucide-react'

const mediaConfig = {
  image: {
    mediaType: 'image',
    icon: Image,
    hint: 'Add an Image',
    uploadOptionHint: 'Upload Image',
    embedPlaceholder: 'Paste your link here...',
    embedOptionHint: 'Embed Link',
  },
  video: {
    mediaType: 'video',
    icon: Video,
    hint: 'Add a Video',
    uploadOptionHint: 'Upload Video',
    embedPlaceholder: 'Paste your link here...',
    embedOptionHint: 'Embed Video',
  },
}

export default mediaConfig
