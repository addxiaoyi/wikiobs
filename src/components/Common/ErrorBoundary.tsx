import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleResetStorage = () => {
    try {
      sessionStorage.clear()
    } catch {
      // ignore
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0e1015] p-6 text-foreground select-none font-sans">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#141722]/90 p-6 shadow-2xl backdrop-blur-2xl text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 shadow-lg shadow-red-500/10">
              <AlertCircle size={24} />
            </div>

            <h2 className="text-base font-semibold text-foreground tracking-tight">工作区遇到异常</h2>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              渲染进程捕获到未处理的错误。这通常是由于热更新文件切换或资源锁定引起的，已阻止白屏并保护您的笔记数据。
            </p>

            {this.state.error && (
              <div className="mt-4 max-h-36 overflow-y-auto rounded-lg border border-red-500/20 bg-black/40 p-3 text-left font-mono text-[11px] text-red-300">
                <p className="font-semibold text-red-200">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-[10px] text-muted-foreground/80 whitespace-pre-wrap break-all">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={this.handleResetStorage}
                className="text-xs"
              >
                <Home size={13} className="mr-1.5" />
                清除临时会话
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={this.handleReload}
                className="text-xs shadow-md shadow-[#7b68ee]/25"
              >
                <RotateCcw size={13} className="mr-1.5" />
                重新载入工作区
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
