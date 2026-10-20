/**
 * GSAP Animation Presets & Utilities
 * 复用动画预设、工具函数，供整个项目共享使用
 */
import gsap from 'gsap'

const CLEAR_MOTION_PROPS = 'transform,opacity,visibility'

// ============================================================
// 通用缓动预设
// ============================================================
export const Easing = {
  smooth: 'power2.out',
  smoothIn: 'power2.in',
  smoothInOut: 'power2.inOut',
  bounce: 'back.out(1.7)',
  elastic: 'elastic.out(1, 0.4)',
  snappy: 'power3.out',
  snappyIn: 'power3.in',
  expoOut: 'expo.out',
} as const

// ============================================================
// DOM 元素入场动画
// ============================================================

/** 淡入 + 上移入场 */
export const fadeInUp = (el: gsap.TweenTarget, duration = 0.5, delay = 0) =>
  gsap.fromTo(
    el,
    { autoAlpha: 0, y: 30 },
    { autoAlpha: 1, y: 0, duration, delay, ease: Easing.smooth, clearProps: CLEAR_MOTION_PROPS, overwrite: 'auto' },
  )

/** 淡入 + 缩放入场 */
export const fadeInScale = (el: gsap.TweenTarget, duration = 0.4, delay = 0) =>
  gsap.fromTo(
    el,
    { autoAlpha: 0, scale: 0.9 },
    { autoAlpha: 1, scale: 1, duration, delay, ease: Easing.smooth, clearProps: CLEAR_MOTION_PROPS, overwrite: 'auto' },
  )

/** 淡入入场 (纯透明度) */
export const fadeIn = (el: gsap.TweenTarget, duration = 0.4, delay = 0) =>
  gsap.fromTo(
    el,
    { autoAlpha: 0 },
    { autoAlpha: 1, duration, delay, ease: Easing.smooth, clearProps: 'opacity,visibility', overwrite: 'auto' },
  )

/** 淡出退场 */
export const fadeOut = (el: gsap.TweenTarget, duration = 0.3) =>
  gsap.to(el, { autoAlpha: 0, duration, ease: Easing.smoothIn })

/** 从右侧滑入 */
export const slideInRight = (el: gsap.TweenTarget, duration = 0.4, delay = 0) =>
  gsap.fromTo(
    el,
    { autoAlpha: 0, x: 40 },
    { autoAlpha: 1, x: 0, duration, delay, ease: Easing.smooth, clearProps: CLEAR_MOTION_PROPS, overwrite: 'auto' },
  )

/** 从底部滑入 */
export const slideInUp = (el: gsap.TweenTarget, duration = 0.45, delay = 0, yOffset = 40) =>
  gsap.fromTo(
    el,
    { autoAlpha: 0, y: yOffset },
    { autoAlpha: 1, y: 0, duration, delay, ease: Easing.smooth, clearProps: CLEAR_MOTION_PROPS, overwrite: 'auto' },
  )

// ============================================================
// 组合动画
// ============================================================

/** 列表错位入场 (stagger) */
export const staggerFadeInUp = (els: gsap.TweenTarget, duration = 0.4, stagger = 0.06, delay = 0) =>
  gsap.fromTo(
    els,
    { autoAlpha: 0, y: 24 },
    {
      autoAlpha: 1,
      y: 0,
      duration,
      stagger,
      delay,
      ease: Easing.smooth,
      clearProps: CLEAR_MOTION_PROPS,
      overwrite: 'auto',
    },
  )

/** 列表错位淡入 */
export const staggerFadeIn = (els: gsap.TweenTarget, duration = 0.35, stagger = 0.05, delay = 0) =>
  gsap.fromTo(
    els,
    { autoAlpha: 0 },
    {
      autoAlpha: 1,
      duration,
      stagger,
      delay,
      ease: Easing.smooth,
      clearProps: 'opacity,visibility',
      overwrite: 'auto',
    },
  )

// ============================================================
// 特殊效果
// ============================================================

/** 脉冲效果 (用于进度条、按钮等) */
export const pulse = (el: gsap.TweenTarget, scale = 1.05, duration = 0.6) =>
  gsap.to(el, {
    scale,
    duration: duration / 2,
    yoyo: true,
    repeat: -1,
    ease: Easing.smoothInOut,
  })

/** 弹跳提示 (一次性) */
export const bounceIn = (el: gsap.TweenTarget, duration = 0.6, delay = 0) =>
  gsap.fromTo(el, { scale: 0 }, { scale: 1, duration, delay, ease: Easing.bounce })

/** 摇晃效果 (错误状态) */
export const shake = (el: gsap.TweenTarget, xAmount = 6, duration = 0.4) =>
  gsap.fromTo(el, { x: -xAmount }, { x: xAmount, duration, ease: 'power1.inOut', yoyo: true, repeat: 5 })

// ============================================================
// 进度条动画
// ============================================================

/**
 * 动画化进度条宽度
 * @param el - 进度条内部 div
 * @param from - 起始百分比 (0-1)
 * @param to - 目标百分比 (0-1)
 * @param duration - 动画时长
 */
export const animateProgress = (el: gsap.TweenTarget, from: number, to: number, duration = 0.6) =>
  gsap.fromTo(el, { width: `${from * 100}%` }, { width: `${to * 100}%`, duration, ease: Easing.snappy })

// ============================================================
// 弹窗入场/退场编排
// ============================================================

/**
 * 弹窗入场: 遮罩淡入 + 内容缩放弹入
 * @param backdrop - 遮罩层元素
 * @param content - 弹窗内容元素
 */
export const animateModalIn = (backdrop: gsap.TweenTarget, content: gsap.TweenTarget) => {
  const tl = gsap.timeline()
  tl.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: Easing.smooth })
  tl.fromTo(
    content,
    { autoAlpha: 0, scale: 0.92, y: 20 },
    {
      autoAlpha: 1,
      scale: 1,
      y: 0,
      duration: 0.35,
      ease: Easing.snappy,
      clearProps: 'transform,opacity,visibility',
      overwrite: 'auto',
    },
    '-=0.1',
  )
  return tl
}

/**
 * 弹窗退场: 内容缩小 + 遮罩淡出
 * @param backdrop - 遮罩层元素
 * @param content - 弹窗内容元素
 * @param onComplete - 完成回调
 */
export const animateModalOut = (backdrop: gsap.TweenTarget, content: gsap.TweenTarget, onComplete?: () => void) => {
  const tl = gsap.timeline({ onComplete })
  tl.to(content, { autoAlpha: 0, scale: 0.92, y: 10, duration: 0.2, ease: Easing.smoothIn, overwrite: 'auto' })
  tl.to(backdrop, { autoAlpha: 0, duration: 0.2, ease: Easing.smoothIn, clearProps: 'opacity,visibility' }, '-=0.1')
  return tl
}

// ============================================================
// 图形/节点动画 (用于知识图谱)
// ============================================================

export interface GraphNodeAnimConfig {
  scale?: number
  opacity?: number
  duration?: number
  stagger?: number
}

/**
 * 图形节点入场动画
 * @param nodes - 节点 DOM 元素数组
 */
export const animateGraphNodesIn = (nodes: gsap.TweenTarget, config: GraphNodeAnimConfig = {}) => {
  const { scale = 1, opacity = 1, duration = 0.5, stagger = 0.03 } = config
  return gsap.fromTo(
    nodes,
    { scale: 0, autoAlpha: 0 },
    { scale, autoAlpha: opacity, duration, stagger, ease: Easing.elastic },
  )
}

/**
 * 图形连线入场动画
 * @param edges - 连线 DOM 元素数组
 */
export const animateGraphEdgesIn = (edges: gsap.TweenTarget, duration = 0.4, delay = 0.2) =>
  gsap.fromTo(
    edges,
    { autoAlpha: 0, drawSVG: '0%' },
    { autoAlpha: 1, drawSVG: '100%', duration, delay, ease: Easing.smooth },
  )

// ============================================================
// 数字滚动动画
// ============================================================

/** 数字滚动计数 */
export const animateCount = (el: gsap.TweenTarget, from: number, to: number, duration = 1) =>
  gsap.fromTo(
    el,
    { textContent: from },
    {
      textContent: to,
      duration,
      ease: Easing.smooth,
      snap: { textContent: 1 },
      roundProps: 'textContent',
    },
  )
