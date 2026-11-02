/**
 * 品牌色的 Tailwind 接线。
 *
 * 色值只存一份，放在 global.css 的三元组令牌里（空格分隔，例如 `123 104 238`）：
 *
 *   --accent-ink    常态     浅色 #7b68ee / 暗色 #9d8ff5
 *   --accent-hover  悬停     浅色 #6c5ce7 / 暗色 #8f86fb
 *   --accent-soft   底衬     rgb(var(--accent-ink) / α)，α 浅色 8%、暗色 15%
 *
 * 这里把 color 写成函数而不是字符串，是因为两种写法语义不同：
 *   - 字符串 'var(--accent-ink)'：只能生成不带透明度的 text-brand / border-brand；
 *     text-brand/70 会生成选择器却没有任何声明（Tailwind 无法在编译期把十六进制变量
 *     拆成 rgb 分量），属于“看着有这个类、其实不生效”的静默失效。
 *   - 函数 ({ opacityValue }) => …：Tailwind 把 α 代进 <alpha-value> 位置，
 *     于是输出 rgb(var(--accent-ink) / .7)，编译期不需要知道具体色值。
 * 令牌本身是三元组，所以 rgb(var(--accent-ink) / α) 在运行时也是合法的。
 *
 * 由此得到三种可用的工具类前缀：`brand`（= ink）、`brand-hover`、`brand-soft`，
 * 以及 brand-ink 这个显式别名。改主色时只改 global.css，组件无需改动。
 */
const withAlpha = (variable) => (value) =>
  value.opacityValue === undefined ? `var(${variable})` : `rgb(var(${variable}) / ${value.opacityValue})`

export const brandColors = {
  brand: {
    DEFAULT: withAlpha('--accent-ink'),
    ink: withAlpha('--accent-ink'),
    hover: withAlpha('--accent-hover'),
    // soft 本身已是完整的 rgb() 颜色，不能再走 withAlpha，否则会拼出非法值；
    // 也因此 bg-brand-soft/50 这类透明度修饰不可用（α 由主题决定，不能再叠一层）。
    soft: 'var(--accent-soft)',
  },
}
