/**
 * 插件编辑提案 - 一次确认一条的审批队列
 *
 * 插件通过 api.app.proposeEdit 提交 diff，宿主先把它交给渲染层做确认，
 * 用户接受才落盘。同一时刻只允许一条待确认提案，避免插件连环提交把用户淹掉。
 */

import { BrowserWindow } from 'electron'
import * as fs from 'fs'
import Store from 'electron-store'
import type { PluginActiveNoteInfo, PluginNoteEditProposal } from '@shared/plugin-types'
import { logger } from './common/logger'
import { resolveExistingVaultPath } from './filesystem/pathGuard'
import type { StoreSchema } from './electron-store/storeConfig'

export interface EditProposalDecision {
  proposalId: string
  accepted: boolean
}

export interface EditProposalResult {
  accepted: boolean
  error?: string
}

// 渲染层没在有效期内确认，就按拒绝处理，免得插件永远等在一个 Promise 上。
const EDIT_PROPOSAL_TIMEOUT_MS = 5 * 60 * 1000

// 通知渲染层打开差异视图；由窗口接线方注册，或退化为单纯广播事件。
type EditProposalRequester = (
  proposal: PluginNoteEditProposal,
  proposalId: string,
) => Promise<EditProposalResult | undefined> | EditProposalResult

interface PendingEditProposal {
  proposalId: string
  resolve: (result: EditProposalResult) => void
  timeout: ReturnType<typeof setTimeout> | null
}

const store = new Store<StoreSchema>()

let pendingEditProposal: PendingEditProposal | null = null

let editProposalRequester: EditProposalRequester | null = null

let nextProposalId = 0

export function buildProposalId(): string {
  nextProposalId += 1
  return `edit-${Date.now().toString(36)}-${nextProposalId}`
}

// 当前活动笔记：插件读它决定要给哪篇笔记提提案。
let activeNote: PluginActiveNoteInfo | null = null

export function getActiveNote(): PluginActiveNoteInfo | null {
  return activeNote
}

// 向所有窗口广播宿主事件；没有窗口时（如单元测试）静默跳过。
function broadcastToWindows(channel: string, payload: unknown): void {
  if (!BrowserWindow) return
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload)
  }
}

// 同一路径来回切换不广播，避免订阅方白白重算。
export function notifyActiveNoteChanged(note: PluginActiveNoteInfo | null): void {
  if (activeNote?.path === note?.path) return
  activeNote = note
  broadcastToWindows('plugins:active-note:changed', note)
}

export function setEditProposalRequester(requester: EditProposalRequester | null): void {
  editProposalRequester = requester
}

function finishEditProposal(proposalId: string, result: EditProposalResult): void {
  const pending = pendingEditProposal
  if (!pending || pending.proposalId !== proposalId) return
  pendingEditProposal = null
  if (pending.timeout) clearTimeout(pending.timeout)
  pending.resolve(result)
}

export function settleEditProposal(decision: EditProposalDecision): boolean {
  const pending = pendingEditProposal
  if (!pending || pending.proposalId !== decision.proposalId) return false
  pendingEditProposal = null
  if (pending.timeout) clearTimeout(pending.timeout)
  pending.resolve(
    decision.accepted ? { accepted: true } : { accepted: false, error: 'Edit proposal was rejected by the user.' },
  )
  return true
}

export async function proposeNoteEdit(proposal: PluginNoteEditProposal): Promise<EditProposalResult> {
  if (!proposal || typeof proposal.path !== 'string') {
    return { accepted: false, error: 'path is required.' }
  }
  if (typeof proposal.proposedContent !== 'string') {
    return { accepted: false, error: 'proposedContent is required.' }
  }
  if (!editProposalRequester) {
    return { accepted: false, error: 'No renderer is connected to confirm edit proposals.' }
  }
  if (pendingEditProposal) {
    return { accepted: false, error: 'Another edit proposal is already awaiting confirmation.' }
  }

  // 没带原文时从 vault 读：越界路径由 resolveExistingVaultPath 拦截并抛错
  let original = typeof proposal.originalContent === 'string' ? proposal.originalContent : ''
  if (typeof proposal.originalContent !== 'string') {
    const vaultPath = store.get('vaultDirectory') as string
    if (vaultPath) {
      try {
        const resolved = resolveExistingVaultPath(vaultPath, proposal.path)
        if (fs.existsSync(resolved)) original = fs.readFileSync(resolved, 'utf-8')
      } catch (e) {
        logger.error('PluginSystem', `Failed to read edit proposal target: ${proposal.path}`, e)
      }
    }
  }
  const normalized: PluginNoteEditProposal = {
    path: proposal.path,
    originalContent: original,
    proposedContent: proposal.proposedContent,
    rationale: proposal.rationale,
  }

  return new Promise<EditProposalResult>((resolve) => {
    const proposalId = buildProposalId()
    pendingEditProposal = {
      proposalId,
      resolve,
      timeout: setTimeout(() => {
        finishEditProposal(proposalId, { accepted: false, error: 'Edit proposal was not confirmed in time.' })
      }, EDIT_PROPOSAL_TIMEOUT_MS),
    }

    // 请求方可能在同步路径里就给出结果，也可能异步回；两种都落到 finish 上统一收口。
    try {
      if (editProposalRequester) {
        const outcome = editProposalRequester(normalized, proposalId)
        if (outcome && typeof (outcome as Promise<unknown>).then === 'function') {
          ;(outcome as Promise<EditProposalResult>).then(
            (result) => finishEditProposal(proposalId, result),
            (e) => finishEditProposal(proposalId, { accepted: false, error: String(e) }),
          )
        }
      } else {
        broadcastToWindows('plugins:edit-note:proposed', { ...normalized, proposalId })
      }
    } catch (e) {
      finishEditProposal(proposalId, { accepted: false, error: String(e) })
    }
  })
}
