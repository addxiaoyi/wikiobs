import React, { useState } from 'react';
import ShinyText from '@/components/ui/ShinyText';
import Stepper, { Step } from '@/components/ui/Stepper';
import { Sparkles, Layers, CheckCircle2, ShieldCheck, Database, Cpu } from 'lucide-react';

export const ReactBitsShowcase: React.FC = () => {
  const [stepperTheme, setStepperTheme] = useState<'dark' | 'light'>('dark');
  const [stepperIndicator, setStepperIndicator] = useState<'numbers' | 'dots' | 'bars'>('numbers');
  const [stepperOrientation, setStepperOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  return (
    <div className={`p-8 rounded-2xl border transition-colors ${
      stepperTheme === 'dark' 
        ? 'bg-[#0e1015] border-white/10 text-white' 
        : 'bg-[#ffffff] border-zinc-200 text-zinc-900 shadow-xl'
    }`}>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 border-current/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="size-5 text-[#a29bfe]" />
            <h2 className="text-xl font-bold tracking-tight">
              <ShinyText
                text="React Bits Integration Showcase"
                color={stepperTheme === 'dark' ? '#d4d4d8' : '#27272a'}
                shineColor={stepperTheme === 'dark' ? '#ffffff' : '#7b68ee'}
                speed={2.2}
                shineWidth={45}
                softness={0.7}
                trigger="loop"
              />
            </h2>
          </div>
          <p className="text-xs text-muted-foreground opacity-75">
            Verified integration of ShinyText and Stepper components from React Bits.
          </p>
        </div>

        {/* Theme toggle */}
        <div className="flex items-center gap-2 text-xs">
          <span className="opacity-70">Theme:</span>
          <button
            type="button"
            onClick={() => setStepperTheme(t => (t === 'dark' ? 'light' : 'dark'))}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
              stepperTheme === 'dark'
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                : 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200'
            }`}
          >
            {stepperTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Component 1: ShinyText Demos */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-current/10 pb-3">
            <Layers className="size-4 text-purple-400" />
            <h3 className="text-sm font-semibold tracking-wide">
              1. &lt;ShinyText /&gt; Variants
            </h3>
          </div>

          <div className="space-y-4">
            {/* Demo 1: Continuous Loop */}
            <div className={`p-4 rounded-xl border ${stepperTheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="text-[11px] uppercase tracking-wider opacity-60 mb-2 font-mono">Loop (Speed 2s, 120deg)</div>
              <div className="text-lg font-semibold">
                <ShinyText
                  text="Helstera WIKIOBS 知识库引擎"
                  color={stepperTheme === 'dark' ? '#a1a1aa' : '#52525b'}
                  shineColor={stepperTheme === 'dark' ? '#ffffff' : '#000000'}
                  speed={2}
                  shineWidth={40}
                  trigger="loop"
                />
              </div>
            </div>

            {/* Demo 2: Hover Sweep & Glow */}
            <div className={`p-4 rounded-xl border ${stepperTheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="text-[11px] uppercase tracking-wider opacity-60 mb-2 font-mono">Hover Trigger + Follow Pointer + Glow</div>
              <div className="text-lg font-semibold cursor-pointer select-none">
                <ShinyText
                  text="光标悬停掠过测试 (Hover Me)"
                  color={stepperTheme === 'dark' ? '#a1a1aa' : '#52525b'}
                  shineColor="#7b68ee"
                  glow={0.8}
                  speed={1.5}
                  trigger="hover"
                  followPointer={true}
                />
              </div>
            </div>

            {/* Demo 3: Snappy Easing with Multi-bands */}
            <div className={`p-4 rounded-xl border ${stepperTheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="text-[11px] uppercase tracking-wider opacity-60 mb-2 font-mono">Snappy Multi-Bands (Chrome Shimmer)</div>
              <div className="text-base font-semibold">
                <ShinyText
                  text="双光带高光脉冲 · 双向往返 Yoyo"
                  color={stepperTheme === 'dark' ? '#94a3b8' : '#475569'}
                  shineColor={stepperTheme === 'dark' ? '#38bdf8' : '#0284c7'}
                  speed={2.5}
                  bands={2}
                  yoyo={true}
                  easing="snappy"
                  trigger="loop"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Component 2: Stepper Demos */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-current/10 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <h3 className="text-sm font-semibold tracking-wide">
                2. &lt;Stepper /&gt; Interactive Flow
              </h3>
            </div>

            {/* Stepper controls */}
            <div className="flex items-center gap-2 text-xs">
              <select
                aria-label="Stepper indicator style"
                value={stepperIndicator}
                onChange={e => setStepperIndicator(e.target.value as any)}
                className={`rounded px-2 py-1 text-xs border ${
                  stepperTheme === 'dark' ? 'bg-[#181a20] border-white/20 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                }`}
              >
                <option value="numbers">Numbers</option>
                <option value="dots">Dots</option>
                <option value="bars">Bars</option>
              </select>

              <button
                type="button"
                onClick={() => setStepperOrientation(o => (o === 'horizontal' ? 'vertical' : 'horizontal'))}
                className={`px-2.5 py-1 rounded text-xs border font-medium ${
                  stepperTheme === 'dark' ? 'bg-white/10 border-white/20 text-white' : 'bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
              >
                {stepperOrientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
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
                    className="mt-2 text-xs text-purple-400 hover:underline"
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
