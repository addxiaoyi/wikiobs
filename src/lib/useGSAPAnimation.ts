/**
 * useGSAPAnimation - React Hook for GSAP lifecycle management
 *
 * 特性:
 * - 自动清理 (cleanup on unmount)
 * - useGSAP context 支持
 * - 便捷的 ref 动画绑定
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import gsap from 'gsap'

// ============================================================
// useGSAP - 核心 hook，管理 GSAP 动画生命周期
// ============================================================

/**
 * 在组件挂载后执行 GSAP 动画，卸载时自动清理
 * @param callback - 动画执行的函数，接收 gsap context 的 safe selector
 * @param deps - 依赖数组，变化时重新执行
 */
export function useGSAPAnimation(
  callback: (ctx: gsap.Context) => (() => void) | void,
  deps: React.DependencyList = [],
) {
  const ctxRef = useRef<gsap.Context | null>(null)

  useEffect(() => {
    let callbackCleanup: (() => void) | void
    const ctx = gsap.context(() => {
      callbackCleanup = callback(ctx)
    })
    ctxRef.current = ctx

    return () => {
      callbackCleanup?.()
      if (ctxRef.current) {
        ctxRef.current.revert()
        ctxRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// ============================================================
// useGSAPTimeline - 创建可复用的 GSAP timeline
// ============================================================

export function useGSAPTimeline(vars: gsap.TimelineVars = {}) {
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const getTimeline = useCallback(() => {
    if (!tlRef.current) {
      tlRef.current = gsap.timeline(vars)
    }
    return tlRef.current
  }, [vars])

  useEffect(() => {
    return () => {
      if (tlRef.current) {
        tlRef.current.kill()
        tlRef.current = null
      }
    }
  }, [])

  return { getTimeline }
}

// ============================================================
// useAnimatedMount - 控制组件入场/退场动画
// ============================================================

interface UseAnimatedMountOptions {
  /** 入场延迟 (秒) */
  mountDelay?: number
  /** 退场前延迟 (秒) */
  unmountDelay?: number
}

/**
 * 为条件渲染提供 animated 的 mount/unmount 状态
 * @returns { isMounted, isAnimating, triggerUnmount }
 */
export function useAnimatedMount({ mountDelay = 0, unmountDelay = 0.3 }: UseAnimatedMountOptions = {}) {
  const [state, setState] = useState<'entering' | 'mounted' | 'exiting' | 'unmounted'>('entering')
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setState('mounted'), mountDelay * 1000)
    return () => clearTimeout(timer)
  }, [mountDelay])

  const triggerUnmount = useCallback(() => {
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current)
    setState('exiting')
    unmountTimerRef.current = setTimeout(() => {
      unmountTimerRef.current = null
      setState('unmounted')
    }, unmountDelay * 1000)
  }, [unmountDelay])

  useEffect(() => {
    return () => {
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current)
    }
  }, [])

  return {
    isMounted: state !== 'unmounted',
    isAnimating: state === 'entering' || state === 'exiting',
    stage: state,
    triggerUnmount,
  }
}

// ============================================================
// useStaggerAnimation - 列表错位动画便捷 hook
// ============================================================

interface StaggerConfig {
  duration?: number
  stagger?: number
  delay?: number
  y?: number
  x?: number
  scale?: number
  autoAlpha?: number
}

/**
 * 为列表项提供错位入场动画
 */
export function useStaggerAnimation(selector: string, config: StaggerConfig = {}, deps: React.DependencyList = []) {
  useGSAPAnimation(() => {
    const els = document.querySelectorAll(selector)
    if (!els.length) return

    gsap.fromTo(
      els,
      {
        autoAlpha: config.autoAlpha ?? 0,
        y: config.y ?? 24,
        x: config.x ?? 0,
        scale: config.scale ?? 1,
      },
      {
        autoAlpha: 1,
        y: 0,
        x: 0,
        scale: 1,
        duration: config.duration ?? 0.4,
        stagger: config.stagger ?? 0.06,
        delay: config.delay ?? 0,
        ease: 'power2.out',
      },
    )
  }, deps)
}

// ============================================================
// useScrollToAnimate - 滚动到元素时触发动画
// ============================================================

/**
 * 当元素滚动进入视口时触发回调
 */
export function useScrollTrigger(
  callback: (el: Element) => void,
  options: { threshold?: number; rootMargin?: string } = {},
) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback(entry.target)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: options.threshold ?? 0.1, rootMargin: options.rootMargin ?? '0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ref
}
