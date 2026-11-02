import React, { useState } from 'react';
import Stepper, { Step } from '@/components/ui/Stepper';
import { Sparkles, Layers, CheckCircle2, ShieldCheck, Database, Cpu } from 'lucide-react';

export const ReactBitsShowcase: React.FC = () => {
  const [stepperTheme, setStepperTheme] = useState<'dark' | 'light'>('dark');
  const [stepperIndicator, setStepperIndicator] = useState<'numbers' | 'dots' | 'bars'>('numbers');
  const [stepperOrientation, setStepperOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  return (
    <div className="p-8 rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] text-foreground transition-colors">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="size-5 text-brand" />
            <h2 className="text-xl font-bold tracking-tight">React Bits Integration Showcase</h2>
          </div>
          <p className="text-xs text-muted-foreground opacity-75">
            来自 React Bits 的扁平排版样例与 Stepper 组件集成演示。
          </p>
        </div>

        {/* Theme toggle */}
        <div className="flex items-center gap-2 text-xs">
          <span className="opacity-70">主题：</span>
          <button
            type="button"
            onClick={() => setStepperTheme(t => (t === 'dark' ? 'light' : 'dark'))}
            className="px-3 py-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface-2)] font-medium text-foreground transition-all hover:bg-[var(--surface-3)]"
          >
            {stepperTheme === 'dark' ? '深色模式' : '浅色模式'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Component 1: Flat typography samples */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3">
            <Layers className="size-4 text-brand" />
            <h3 className="text-sm font-semibold tracking-wide">1. 排版示例</h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]">
              <div className="text-[11px] uppercase tracking-wider opacity-60 mb-2 font-mono">正文 · 次级文字</div>
              <div className="text-lg font-semibold text-muted-foreground">Helstera WIKIOBS 知识库引擎</div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]">
              <div className="text-[11px] uppercase tracking-wider opacity-60 mb-2 font-mono">强调 · 品牌色</div>
              <div className="text-lg font-semibold text-brand">品牌强调色 · 主色令牌</div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]">
              <div className="text-[11px] uppercase tracking-wider opacity-60 mb-2 font-mono">辅助 · 前景弱化</div>
              <div className="text-base font-semibold text-foreground/80">本地向量索引 · 秒级语义检索</div>
            </div>
          </div>
        </div>

        {/* Component 2: Stepper Demos */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <h3 className="text-sm font-semibold tracking-wide">
                2. &lt;Stepper /&gt; 交互流程
              </h3>
            </div>

            {/* Stepper controls */}
            <div className="flex items-center gap-2 text-xs">
              <select
                aria-label="Stepper 指示器样式"
                value={stepperIndicator}
                onChange={e => setStepperIndicator(e.target.value as any)}
                className="rounded px-2 py-1 text-xs border border-[var(--line)] bg-[var(--surface-2)] text-foreground"
              >
                <option value="numbers">数字</option>
                <option value="dots">圆点</option>
                <option value="bars">条形</option>
              </select>

              <button
                type="button"
                onClick={() => setStepperOrientation(o => (o === 'horizontal' ? 'vertical' : 'horizontal'))}
                className="px-2.5 py-1 rounded text-xs border border-[var(--line)] bg-[var(--surface-2)] font-medium text-foreground"
              >
                {stepperOrientation === 'horizontal' ? '横向' : '纵向'}
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <Stepper
              initialStep={currentStep}
              onStepChange={step => {
                setCurrentStep(step);
                setIsCompleted(false);
              }}
              onFinalStepCompleted={() => {
                setIsCompleted(true);
              }}
              theme={stepperTheme}
              indicator={stepperIndicator}
              orientation={stepperOrientation}
              width={stepperOrientation === 'vertical' ? 520 : 460}
              backButtonText="上一步"
              nextButtonText="继续"
              completeButtonText="完成设置"
              completedContent={
                <div className="py-8 text-center space-y-3">
                  <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <ShieldCheck className="size-6" />
                  </div>
                  <h4 className="text-sm font-semibold">初始化已全部就绪</h4>
                  <p className="text-xs opacity-70 max-w-xs mx-auto">
                    您随时可以进入 WIKIOBS 知识库主界面开始记录与关联笔记。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setIsCompleted(false);
                    }}
                    className="mt-2 text-xs text-brand hover:underline"
                  >
                    重置并重新演示
                  </button>
                </div>
              }
            >
              <Step title="工作区" description="选择本地知识库目录" icon={<Database className="size-3.5" />}>
                <div className="py-2 space-y-1.5">
                  <h4 className="text-sm font-semibold">选择您的本地知识库</h4>
                  <p className="text-xs opacity-75">
                    WIKIOBS 基于本地文件夹运行，所有 Markdown 文件与附件均完全由您本地掌控。
                  </p>
                </div>
              </Step>

              <Step title="嵌入向量" description="配置本地离线向量模型" icon={<Cpu className="size-3.5" />}>
                <div className="py-2 space-y-1.5">
                  <h4 className="text-sm font-semibold">向量模型计算引擎</h4>
                  <p className="text-xs opacity-75">
                    采用内置 Xenova/bge-small-en 本地推理，毫秒级实时生成高维关联向量。
                  </p>
                </div>
              </Step>

              <Step title="AI 助手" description="配置推理与对话大模型" icon={<Sparkles className="size-3.5" />}>
                <div className="py-2 space-y-1.5">
                  <h4 className="text-sm font-semibold">本地/远程 LLM 配置</h4>
                  <p className="text-xs opacity-75">
                    支持 Ollama 本地模型与 OpenAI 兼容接口，私密检索与双向知识问答。
                  </p>
                </div>
              </Step>
            </Stepper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactBitsShowcase;
