// EvidenceNavigator.jsx
import { useState, useRef, useEffect } from 'react'
import {
  Folder, FolderOpen, FileText, Terminal, Binary,
  Cpu, Network, ChevronRight, ChevronDown, Tag, Eye,
  AlertTriangle, List, ScanSearch,
} from 'lucide-react'
import { useEngine } from './ScenarioEngine'

const VIEWS = [
  { id: 'explorer', label: 'Explorer', icon: Folder },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'hex', label: 'HEX', icon: Binary },
  { id: 'ram', label: 'RAM', icon: Cpu },
  { id: 'network', label: 'Network', icon: Network },
]

export default function EvidenceNavigator() {
  const { state, setView } = useEngine()
  const { activeView } = state

  return (
    <div className="panel flex flex-col h-full">
      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-raised)' }}
        className="flex flex-shrink-0">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              padding: '8px 14px',
              borderBottom: activeView === id ? '2px solid var(--green-main)' : '2px solid transparent',
              color: activeView === id ? 'var(--green-main)' : 'var(--text-muted)',
              background: activeView === id ? 'rgba(0,200,100,0.06)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* View */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'explorer' && <FileExplorerView />}
        {activeView === 'terminal' && <TerminalView />}
        {activeView === 'hex' && <HexView />}
        {activeView === 'ram' && <RamView />}
        {activeView === 'network' && <NetworkView />}
      </div>
    </div>
  )
}

// ── File Explorer ─────────────────────────────────────────────────────────────
function FileExplorerView() {
  const { state, selectNode } = useEngine()
  const { scenario, selectedNode } = state
  if (!scenario?.filesystem) return <EmptyPanel msg="No filesystem data in this scenario" />

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Tree sidebar */}
      <div style={{
        width: '220px', flexShrink: 0,
        borderRight: '1px solid var(--border-dim)',
        overflowY: 'auto', padding: '8px 4px',
      }}>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', padding: '0 8px 6px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Filesystem
        </div>
        <TreeNode
          node={scenario.filesystem.root}
          path={scenario.filesystem.root.name}
          depth={0}
          selectedPath={selectedNode?.path}
          onSelect={selectNode}
        />
      </div>

      {/* Detail panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {selectedNode
          ? <FileDetail node={selectedNode} />
          : <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', marginTop: '40px' }}>
            ← Select a file to inspect its metadata
          </div>
        }
      </div>
    </div>
  )
}

function TreeNode({ node, path, depth, selectedPath, onSelect }) {
  const [open, setOpen] = useState(depth < 2)
  const isDir = node.type === 'directory'
  const isSelected = !isDir && selectedPath === path
  const indent = 8 + depth * 14

  return (
    <div>
      <div
        className={`tree-item ${isSelected ? 'active' : ''} ${isDir ? 'dir' : ''}`}
        style={{ paddingLeft: indent }}
        onClick={() => {
          if (isDir) setOpen(o => !o)
          else onSelect({ ...node, path })
        }}
      >
        {isDir
          ? (open
            ? <><ChevronDown size={9} style={{ color: 'var(--green-dim)', flexShrink: 0 }} /><FolderOpen size={11} style={{ color: '#e8c56a', flexShrink: 0 }} /></>
            : <><ChevronRight size={9} style={{ color: 'var(--green-dim)', flexShrink: 0 }} /><Folder size={11} style={{ color: '#e8c56a', flexShrink: 0 }} /></>
          )
          : <><span style={{ width: 9, flexShrink: 0 }} /><FileText size={11} style={{ color: 'var(--blue-accent)', flexShrink: 0 }} /></>
        }
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
      </div>
      {isDir && open && node.children &&
        Object.values(node.children).map(child => (
          <TreeNode
            key={child.name}
            node={child}
            path={`${path}\\${child.name}`}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))
      }
    </div>
  )
}

function FileDetail({ node }) {
  const { tagEvidence, state } = useEngine()
  const meta = node.metadata
  const isTagged = !!state.taggedEvidence.find(e => e.id === node.path)

  if (!meta) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No metadata for this node.</div>
  )

  const siTimes = [
    ['Created', meta.si_created],
    ['Modified', meta.si_modified],
    ['Accessed', meta.si_accessed],
    ['MFT Changed', meta.si_mft_changed],
  ]
  const fnTimes = meta.fn_created ? [
    ['Created', meta.fn_created],
    ['Modified', meta.fn_modified],
    ['Accessed', meta.fn_accessed],
    ['MFT Changed', meta.fn_mft_changed],
  ] : null

  const siVals = siTimes.map(t => t[1]).filter(Boolean)
  const allSiSame = siVals.length > 1 && siVals.every(v => v === siVals[0])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: 'var(--green-main)', fontSize: '13px', fontWeight: 700 }}>{node.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: 2 }}>{node.path}</div>
        </div>
        <button
          className={`btn-tag ${isTagged ? 'tagged' : ''}`}
          onClick={() => tagEvidence({
            id: node.path, name: node.name, type: 'file',
            note: allSiSame ? '⚠ All $SI timestamps identical' : '',
            path: node.path,
          })}
        >
          <Tag size={10} />
          {isTagged ? 'Tagged' : 'Tag Evidence'}
        </button>
      </div>

      {/* File info */}
      <Section title="FILE INFO">
        <table className="ft">
          <tbody>
            {[
              ['Size', node.size ? `${node.size.toLocaleString()} bytes` : '—'],
              ['Extension', node.extension ?? '—'],
              ['Magic Bytes', node.magic_bytes ?? '—'],
              ['Owner', meta.owner ?? '—'],
              ['Permissions', meta.permissions ?? '—'],
              ['Inode / MFT', meta.inode ?? '—'],
            ].map(([k, v]) => (
              <tr key={k}><td className="k">{k}</td><td className="v">{v}</td></tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Slack space info (scenario 02) */}
      {node.slack_bytes != null && (
        <Section title="CLUSTER ALLOCATION"
          warning={node.slack_bytes > 0 ? `⚠ ${node.slack_bytes.toLocaleString()} bytes of slack space` : null}>
          <table className="ft">
            <tbody>
              {[
                ['Logical size', `${node.size?.toLocaleString()} bytes`],
                ['Allocated size', `${node.allocated_size?.toLocaleString()} bytes`],
                ['Cluster size', `${node.cluster_size?.toLocaleString()} bytes`],
                ['Slack space', `${node.slack_bytes?.toLocaleString()} bytes`],
              ].map(([k, v]) => (
                <tr key={k} className={k === 'Slack space' && node.slack_bytes > 0 ? 'anomaly' : ''}>
                  <td className="k">{k}</td><td className="v">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* LSB steganography info (scenario 05) */}
      {meta.lsb_chi_square != null && (
        <Section title="LSB ANALYSIS"
          warning={meta.lsb_chi_square < 0.7 ? `⚠ Chi-square ${meta.lsb_chi_square} — anomalous LSB distribution` : null}>
          <table className="ft">
            <tbody>
              {[
                ['Chi-square', meta.lsb_chi_square],
                ['LSB entropy', meta.lsb_entropy],
                ['EXIF present', meta.exif_stripped ? '✗ STRIPPED' : '✓ Present'],
                ['Camera', meta.exif_camera ?? '—'],
                ['Date taken', meta.exif_date ?? '—'],
              ].map(([k, v]) => (
                <tr key={k} className={
                  (k === 'Chi-square' && meta.lsb_chi_square < 0.7) ||
                    (k === 'EXIF present' && meta.exif_stripped)
                    ? 'anomaly' : ''}>
                  <td className="k">{k}</td><td className="v">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta.lsb_notes && (
            <p style={{ fontSize: '10px', color: meta.lsb_chi_square < 0.7 ? 'var(--amber-main)' : 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
              {meta.lsb_notes}
            </p>
          )}
        </Section>
      )}

      {/* $SI timestamps */}
      <Section title="$STANDARD_INFORMATION Timestamps"
        warning={allSiSame ? '⚠ ALL FOUR IDENTICAL — possible timestomping' : null}>
        <table className="ft">
          <tbody>
            {siTimes.map(([k, v]) => (
              <tr key={k} className={allSiSame ? 'anomaly' : ''}>
                <td className="k">{k}</td><td className="v">{v ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* $FN timestamps */}
      {fnTimes && (
        <Section title="$FILE_NAME Timestamps">
          <table className="ft">
            <tbody>
              {fnTimes.map(([k, v]) => (
                <tr key={k}><td className="k">{k}</td><td className="v">{v ?? '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Content preview */}
      {node.content_preview && (
        <Section title="Content Preview" icon={<Eye size={11} />}>
          <pre style={{
            fontSize: '10px', color: 'var(--text-secondary)',
            background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-sm)', padding: '10px',
            whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0,
          }}>
            {node.content_preview}
          </pre>
        </Section>
      )}
    </div>
  )
}

function Section({ title, warning, icon, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
        <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {title}
        </span>
        {warning && (
          <span style={{
            fontSize: '9px', color: 'var(--red-alert)',
            background: 'var(--red-dim)', padding: '1px 6px', borderRadius: 3,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <AlertTriangle size={9} /> {warning}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Terminal ──────────────────────────────────────────────────────────────────
// Binary extensions — cat will refuse, strings will extract sparse output
const BINARY_EXTENSIONS = new Set(['docx', 'xlsx', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'exe', 'dll'])
// Text-like extensions — both cat and strings work
const TEXT_EXTENSIONS = new Set(['txt', 'log', 'bat', 'tmp', 'csv', 'json', 'xml', 'py', 'sh', 'md'])

function isBinaryExt(ext) { return BINARY_EXTENSIONS.has((ext ?? '').toLowerCase()) }
function isEvtx(ext) { return (ext ?? '').toLowerCase() === 'evtx' }

function TerminalView() {
  const { state, addTerminalLine, clearTerminal } = useEngine()
  const [input, setInput] = useState('')
  const [cmdHistory, setCmdHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const [lines, setLines] = useState([
    { text: '╔════════════════════════════════════════╗', type: 'system' },
    { text: '║  FORENSIC TERMINAL  v2.1 — RESTRICTED  ║', type: 'system' },
    { text: '╚════════════════════════════════════════╝', type: 'system' },
    { text: 'Type "help" for available commands.', type: 'comment' },
    { text: '', type: 'output' },
  ])
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])

  const push = (...newLines) =>
    setLines(l => [...l, ...newLines.map(t => typeof t === 'string' ? { text: t, type: 'output' } : t)])

  const scenario = state.scenario

  const handleCmd = (raw) => {
    const cmd = raw.trim()
    if (!cmd) return
    const parts = cmd.split(/\s+/)
    const base = parts[0].toLowerCase()
    const args = parts.slice(1)

    setCmdHistory(h => [cmd, ...h.slice(0, 49)])
    setHistIdx(-1)
    push({ text: `analyst@forensics:~$ ${cmd}`, type: 'input' })

    if (base === 'clear') { setLines([]); setInput(''); return }

    // ── help ──
    if (base === 'help') {
      push(
        { text: 'Available commands:', type: 'system' },
        '  ls [path]         — list directory contents',
        '  stat <file>       — show file timestamps ($SI)',
        '  istat <inode>     — show full MFT record ($SI + $FN)',
        '  strings <file>    — extract printable strings from any file',
        '  hash <file>       — compute MD5 / SHA-256',
        '  cat <file>        — print text file contents',
        '  xxd <file>        — hex dump first 64 bytes',
        '  history           — show command history',
        '  clear             — clear terminal',
      )
    }

    // ── ls ──
    else if (base === 'ls') {
      if (scenario?.filesystem) {
        const root = scenario.filesystem.root
        const targetPath = args[0]
        let targetNode = root
        if (targetPath) {
          targetNode = resolvePathNode(root, targetPath)
          if (!targetNode) {
            push({ text: `ls: cannot access '${targetPath}': No such file or directory`, type: 'error' })
            setInput(''); return
          }
          if (targetNode.type === 'file') {
            push({ text: `-rw-r--r--  ${targetNode.name}`, type: 'output' })
            setInput(''); return
          }
        }
        const items = targetNode.children ? Object.values(targetNode.children) : []
        if (items.length === 0) {
          push({ text: '(empty directory)', type: 'comment' })
        } else {
          items.forEach(item => push({
            text: `${item.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--'}  ${item.name}`,
            type: item.type === 'directory' ? 'warn' : 'output',
          }))
        }
      } else {
        push({ text: 'No filesystem loaded.', type: 'error' })
      }
    }

    // ── stat ──
    else if (base === 'stat') {
      const target = args[0]
      if (!target) { push({ text: 'Usage: stat <filename>', type: 'error' }); setInput(''); return }
      if (scenario?.filesystem) {
        const found = findFileByName(scenario.filesystem.root, target)
        if (found) {
          const m = found.metadata
          push(
            { text: `  File: ${found.name}`, type: 'output' },
            { text: `  Size: ${found.size?.toLocaleString() ?? '?'} bytes`, type: 'output' },
            { text: `  Modify: ${m?.si_modified ?? '—'}`, type: m?.si_modified === m?.si_created ? 'warn' : 'output' },
            { text: `  Access: ${m?.si_accessed ?? '—'}`, type: m?.si_accessed === m?.si_created ? 'warn' : 'output' },
            { text: `  Change: ${m?.si_mft_changed ?? '—'}`, type: m?.si_mft_changed === m?.si_created ? 'warn' : 'output' },
            { text: `  Birth:  ${m?.si_created ?? '—'}`, type: 'output' },
          )
          const siVals = [m?.si_created, m?.si_modified, m?.si_accessed, m?.si_mft_changed].filter(Boolean)
          if (siVals.length > 1 && siVals.every(v => v === siVals[0])) {
            push({ text: '[!] WARNING: All $SI timestamps identical — possible timestomping detected', type: 'warn' })
          }
        } else {
          push({ text: `stat: cannot stat '${target}': No such file or directory`, type: 'error' })
        }
      }
    }

    // ── istat ──
    else if (base === 'istat') {
      const inodeArg = args[0]
      if (!inodeArg) { push({ text: 'Usage: istat <inode_number>', type: 'error' }); setInput(''); return }
      if (scenario?.filesystem) {
        const found = findFileByInode(scenario.filesystem.root, parseInt(inodeArg))
        if (found) {
          const m = found.metadata
          push(
            { text: `MFT Entry Number: ${m?.inode}`, type: 'system' },
            { text: `Allocated File`, type: 'output' },
            '',
            { text: `$STANDARD_INFORMATION Attribute Values:`, type: 'system' },
            `  Created:       ${m?.si_created}`,
            `  File Modified: ${m?.si_modified}`,
            `  MFT Modified:  ${m?.si_mft_changed}`,
            `  Accessed:      ${m?.si_accessed}`,
            '',
            { text: `$FILE_NAME Attribute Values:`, type: 'system' },
            `  Created:       ${m?.fn_created ?? 'N/A'}`,
            `  File Modified: ${m?.fn_modified ?? 'N/A'}`,
            `  MFT Modified:  ${m?.fn_mft_changed ?? 'N/A'}`,
            `  Accessed:      ${m?.fn_accessed ?? 'N/A'}`,
            `  Name:          ${found.name}`,
          )
          if (m?.fn_created && m?.si_created !== m?.fn_created) {
            push({ text: `[!] $SI and $FN creation times differ — forensic anomaly`, type: 'warn' })
          }
        } else {
          push({ text: `istat: inode ${inodeArg} not found`, type: 'error' })
        }
      }
    }

    // ── history ──
    else if (base === 'history') {
      cmdHistory.forEach((c, i) => push(`  ${cmdHistory.length - i}  ${c}`))
    }

    // ── hash ──
    else if (base === 'hash') {
      const target = args[0]
      if (!target) { push({ text: 'Usage: hash <filename>', type: 'error' }); setInput(''); return }
      push(
        { text: `MD5    (${target}) = ${fakeHash(target, 32)}`, type: 'output' },
        { text: `SHA256 (${target}) = ${fakeHash(target, 64)}`, type: 'output' },
      )
    }

    // ── strings ──
    // Fixed: works on any file with content_preview.
    // Only truly opaque binaries (docx, xlsx, png…) return sparse output.
    // .evtx gets a specific note about being a binary event log.
    else if (base === 'strings') {
      const target = args[0]
      if (!target) { push({ text: 'Usage: strings <filename>', type: 'error' }); setInput(''); return }

      if (scenario?.filesystem) {
        const found = findFileByName(scenario.filesystem.root, target)
        if (!found) {
          push({ text: `strings: ${target}: No such file`, type: 'error' })
          setInput(''); return
        }

        if (isEvtx(found.extension)) {
          // Binary event log — printable strings are event entries
          push({ text: `[binary Windows Event Log — extracting printable strings]`, type: 'comment' })
          if (found.content_preview) {
            found.content_preview.split('\n').forEach(line => push(line))
          }
          push({ text: '[!] Strings extracted from binary .evtx event log', type: 'warn' })

        } else if (isBinaryExt(found.extension)) {
          // Generic binary (Office docs, images, PDFs, executables)
          push(
            { text: `[scanning ${found.name} for printable strings ≥ 4 chars]`, type: 'comment' },
            `${fakeHash(found.name + '1', 8).toUpperCase()}`,
            `${fakeHash(found.name + '2', 12).toUpperCase()}`,
            { text: `[!] Binary file — limited readable strings. Consider using xxd for raw hex.`, type: 'warn' },
          )

        } else if (found.content_preview) {
          // Text, log, bat, tmp, csv — just show content
          push({ text: `[extracting strings from ${found.name}]`, type: 'comment' })
          found.content_preview.split('\n').forEach(line => push(line))

        } else {
          push({ text: `strings: ${target}: No printable strings found`, type: 'output' })
        }
      } else {
        push({ text: 'No filesystem loaded.', type: 'error' })
      }
    }

    // ── cat ──
    // Fixed: only rejects .evtx as binary. All other files with content_preview work.
    else if (base === 'cat') {
      const target = args[0]
      if (!target) { push({ text: 'Usage: cat <filename>', type: 'error' }); setInput(''); return }

      if (scenario?.filesystem) {
        const found = findFileByName(scenario.filesystem.root, target)
        if (!found) {
          push({ text: `cat: ${target}: No such file or directory`, type: 'error' })
        } else if (isEvtx(found.extension)) {
          push({
            text: `cat: ${target}: Binary event log file (Windows .evtx format). Try 'strings ${target}' to extract readable entries.`,
            type: 'error',
          })
        } else if (isBinaryExt(found.extension)) {
          push({
            text: `cat: ${target}: Binary file — use 'strings ${target}' or switch to the HEX view.`,
            type: 'error',
          })
        } else if (found.content_preview) {
          found.content_preview.split('\n').forEach(line => push(line))
        } else {
          push({ text: `cat: ${target}: (empty file)`, type: 'comment' })
        }
      } else {
        push({ text: 'No filesystem loaded.', type: 'error' })
      }
    }

    // ── xxd ──
    else if (base === 'xxd') {
      const target = args[0]
      if (!target) { push({ text: 'Usage: xxd <filename>', type: 'error' }); setInput(''); return }
      if (scenario?.filesystem) {
        const found = findFileByName(scenario.filesystem.root, target)
        const magic = found?.magic_bytes ?? '504B0304'
        push(
          { text: `[hex dump of ${target} — first 64 bytes]`, type: 'comment' },
          { text: `00000000: ${magic.match(/.{2}/g)?.join(' ') ?? magic}  ...`, type: 'output' },
          { text: `[!] Magic bytes ${magic} — ${magicBytesLabel(magic)}`, type: 'warn' },
        )
        // Educational note for .evtx binary format
        if (isEvtx(found?.extension)) {
          push({ text: `[!] 'ElfF' (456C6646) is the Windows Event Log binary format signature. Use 'strings ${target}' to extract readable event entries.`, type: 'warn' })
        }
      }
    }

    else {
      push({ text: `bash: ${base}: command not found. Type 'help' for available commands.`, type: 'error' })
    }

    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') { handleCmd(input); return }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = Math.min(histIdx + 1, cmdHistory.length - 1)
      setHistIdx(idx)
      setInput(cmdHistory[idx] ?? '')
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const idx = Math.max(histIdx - 1, -1)
      setHistIdx(idx)
      setInput(idx === -1 ? '' : cmdHistory[idx] ?? '')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)', padding: '12px' }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '8px' }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.6',
            color: {
              system: 'var(--green-main)',
              input: 'var(--text-primary)',
              output: 'var(--text-secondary)',
              warn: 'var(--amber-main)',
              error: 'var(--red-alert)',
              comment: 'var(--text-muted)',
            }[line.type] ?? 'var(--text-secondary)',
          }}>
            {line.text || '\u00A0'}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border-dim)', paddingTop: 8 }}>
        <span style={{ color: 'var(--green-main)', fontSize: '11px', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
          analyst@forensics:~$
        </span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          autoFocus
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px',
            caretColor: 'var(--green-main)',
          }}
          placeholder="type a command..."
          spellCheck={false}
        />
      </div>
    </div>
  )
}

// ── HEX Viewer ────────────────────────────────────────────────────────────────
function HexView() {
  const { state } = useEngine()
  const node = state.selectedNode
  if (!node) return <EmptyPanel msg="Select a file in the Explorer first" />

  const magic = (node.magic_bytes ?? '504B0304').replace(/\s/g, '')
  const magicBytes = []
  for (let i = 0; i < magic.length; i += 2) magicBytes.push(magic.slice(i, i + 2))

  const allBytes = [...magicBytes]
  while (allBytes.length < 128) {
    const seed = (BigInt(allBytes.length) * 6364136223846793005n) % 256n
    allBytes.push(Number(seed).toString(16).padStart(2, '0').toUpperCase())
  }

  const rows = []
  for (let i = 0; i < allBytes.length; i += 16) {
    const chunk = allBytes.slice(i, i + 16)
    const ascii = chunk.map(b => {
      const n = parseInt(b, 16)
      return n >= 32 && n <= 126 ? String.fromCharCode(n) : '.'
    }).join('')
    rows.push({ offset: i.toString(16).padStart(8, '0').toUpperCase(), hex: chunk, ascii })
  }

  return (
    <div style={{ padding: '12px', overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        HEX DUMP — {node.name}
      </div>
      <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '11px', width: '100%' }}>
        <thead>
          <tr style={{ color: 'var(--text-ghost)' }}>
            <td style={{ paddingRight: 16, paddingBottom: 6 }}>OFFSET</td>
            <td style={{ paddingRight: 16, paddingBottom: 6 }}>00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</td>
            <td style={{ paddingBottom: 6 }}>ASCII</td>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="hex-row">
              <td style={{ color: 'var(--green-dim)', paddingRight: 16, verticalAlign: 'top' }}>{row.offset}</td>
              <td style={{ paddingRight: 16, verticalAlign: 'top', letterSpacing: '0.05em' }}>
                {row.hex.map((b, bi) => (
                  <span
                    key={bi}
                    className={ri === 0 && bi < magicBytes.length ? 'hex-highlight' : ''}
                    style={{ marginRight: bi === 7 ? 12 : 4, color: ri === 0 && bi < magicBytes.length ? undefined : 'var(--text-secondary)' }}
                  >
                    {b}
                  </span>
                ))}
              </td>
              <td style={{ color: 'var(--green-dim)', verticalAlign: 'top' }}>{row.ascii}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12, fontSize: '10px', color: 'var(--amber-main)' }}>
        ★ Highlighted bytes = magic number ({node.magic_bytes}) — {magicBytesLabel(node.magic_bytes ?? '')}
      </div>
    </div>
  )
}

// ── RAM Dump ──────────────────────────────────────────────────────────────────
// Key didactic fix: the student must switch between pslist and psscan views.
// pslist only shows processes where pslist_visible !== false.
// psscan shows all processes (carves raw EPROCESS structures).
// The count discrepancy is surfaced explicitly as a clue.
function RamView() {
  const { state, tagEvidence } = useEngine()
  const data = state.scenario?.ram_dump
  const [scanMode, setScanMode] = useState('pslist') // 'pslist' | 'psscan'
  const [selected, setSelected] = useState(null)

  if (!data) return <EmptyPanel msg="No RAM dump in this scenario" />

  const pslistProcs = data.filter(p => p.pslist_visible !== false)
  const psscanProcs = data  // psscan sees everything
  const shown = scanMode === 'pslist' ? pslistProcs : psscanProcs
  const delta = psscanProcs.length - pslistProcs.length

  const isTagged = (proc) =>
    !!state.taggedEvidence.find(e => e.id === `ram_${proc.pid}`)

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderBottom: '1px solid var(--border-dim)',
        background: 'var(--bg-raised)', flexShrink: 0,
      }}>
        {/* pslist / psscan toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'pslist', label: 'pslist', icon: <List size={10} />, title: 'Walks the kernel ActiveProcessLinks list' },
            { id: 'psscan', label: 'psscan', icon: <ScanSearch size={10} />, title: 'Scans raw memory for EPROCESS pool tags' },
          ].map(({ id, label, icon, title }) => (
            <button
              key={id}
              title={title}
              onClick={() => { setScanMode(id); setSelected(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', fontFamily: 'var(--font-mono)', fontSize: '10px',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${scanMode === id ? 'var(--green-main)' : 'var(--border-dim)'}`,
                background: scanMode === id ? 'rgba(0,200,100,0.12)' : 'var(--bg-surface)',
                color: scanMode === id ? 'var(--green-main)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Process count — delta is the key clue */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {shown.length} process{shown.length !== 1 ? 'es' : ''}
          </span>
          {delta > 0 && (
            <span style={{
              fontSize: '10px', fontFamily: 'var(--font-mono)',
              color: 'var(--amber-main)',
              background: 'rgba(255,184,0,0.08)',
              border: '1px solid var(--amber-dim)',
              padding: '2px 8px', borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <AlertTriangle size={9} />
              pslist: {pslistProcs.length} — psscan: {psscanProcs.length} (+{delta} hidden)
            </span>
          )}
        </div>
      </div>

      {/* Table + Detail split */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Process table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-dim)' }}>
                {['PID', 'PPID', 'PROCESS', 'OFFSET', 'THR', 'FLAGS'].map(h => (
                  <td key={h} style={{ padding: '4px 10px 6px 0' }}>{h}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((proc, i) => {
                const hidden = proc.pslist_visible === false
                const isHiddenInCurrentMode = hidden && scanMode === 'pslist'
                const rowColor = proc.suspicious ? 'var(--red-alert)' : 'var(--text-secondary)'
                const isActive = selected?.pid === proc.pid

                return (
                  <tr
                    key={i}
                    onClick={() => setSelected(proc)}
                    style={{
                      borderBottom: '1px solid var(--bg-raised)',
                      color: rowColor,
                      cursor: 'pointer',
                      background: isActive ? 'rgba(0,200,100,0.06)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '4px 10px 4px 0' }}>{proc.pid}</td>
                    <td style={{ padding: '4px 10px 4px 0' }}>{proc.ppid}</td>
                    <td style={{ padding: '4px 10px 4px 0', color: proc.suspicious ? 'var(--red-alert)' : 'var(--text-primary)' }}>
                      {proc.name}
                      {hidden && scanMode === 'psscan' && (
                        <span style={{ marginLeft: 6, fontSize: '9px', color: 'var(--amber-main)', background: 'rgba(255,184,0,0.1)', padding: '1px 5px', borderRadius: 3 }}>
                          DKOM-hidden
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '4px 10px 4px 0', color: 'var(--text-muted)' }}>{proc.offset}</td>
                    <td style={{ padding: '4px 10px 4px 0' }}>{proc.threads ?? '—'}</td>
                    <td style={{ padding: '4px 0 4px 0' }}>
                      {proc.suspicious && (
                        <span style={{ color: 'var(--red-alert)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={10} /> SUSPICIOUS
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Process detail panel */}
        {selected && (
          <div style={{
            width: '220px', flexShrink: 0,
            borderLeft: '1px solid var(--border-dim)',
            padding: '12px', overflowY: 'auto',
            background: 'var(--bg-raised)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontSize: '12px', color: selected.suspicious ? 'var(--red-alert)' : 'var(--text-primary)', fontWeight: 700 }}>
                {selected.name}
              </div>
              <button
                className={`btn-tag ${isTagged(selected) ? 'tagged' : ''}`}
                onClick={() => tagEvidence({
                  id: `ram_${selected.pid}`,
                  name: `${selected.name} (PID ${selected.pid})`,
                  type: 'process',
                  note: selected.suspicious ? '⚠ Suspicious process' : '',
                  path: `RAM:${selected.offset}`,
                })}
              >
                <Tag size={9} />
                {isTagged(selected) ? 'Tagged' : 'Tag'}
              </button>
            </div>

            <table className="ft" style={{ fontSize: '10px' }}>
              <tbody>
                {[
                  ['PID', selected.pid],
                  ['PPID', selected.ppid],
                  ['Offset', selected.offset],
                  ['Threads', selected.threads ?? '—'],
                  ['pslist', selected.pslist_visible === false ? '✗ HIDDEN' : '✓ visible'],
                  ['psscan', '✓ visible'],
                ].map(([k, v]) => (
                  <tr key={k}
                    className={
                      (k === 'pslist' && selected.pslist_visible === false) ||
                        (k === 'PPID' && selected.ppid === 0 && selected.suspicious)
                        ? 'anomaly' : ''}>
                    <td className="k">{k}</td>
                    <td className="v">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selected.notes && (
              <p style={{ fontSize: '10px', color: 'var(--amber-main)', marginTop: 10, lineHeight: 1.5 }}>
                {selected.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Network Logs ──────────────────────────────────────────────────────────────
// Fix: clicking a row expands its detail + provides a Tag Evidence button.
// Packets in scenario 04/06 can now be tagged and submitted as flags.
function NetworkView() {
  const { state, tagEvidence } = useEngine()
  const data = state.scenario?.network_log
  const [selected, setSelected] = useState(null)

  if (!data) return <EmptyPanel msg="No network log in this scenario" />

  const isTagged = (pkt, idx) =>
    !!state.taggedEvidence.find(e => e.id === `net_${pkt.id ?? idx}`)

  return (
    <div style={{ display: 'flex', height: '100%' }}>

      {/* Packet table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Network Log — Packet Capture
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-dim)' }}>
              {['#', 'TIME', 'SRC', 'DST', 'PROTO', 'INFO'].map(h => (
                <td key={h} style={{ padding: '4px 10px 6px 0' }}>{h}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((pkt, i) => {
              const isActive = selected === i
              return (
                <tr
                  key={i}
                  onClick={() => setSelected(selected === i ? null : i)}
                  style={{
                    borderBottom: '1px solid var(--bg-raised)',
                    color: pkt.suspicious ? 'var(--amber-main)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(255,184,0,0.06)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '4px 10px 4px 0', color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ padding: '4px 10px 4px 0' }}>{pkt.time}</td>
                  <td style={{ padding: '4px 10px 4px 0' }}>{pkt.src}</td>
                  <td style={{ padding: '4px 10px 4px 0' }}>{pkt.dst}</td>
                  <td style={{ padding: '4px 10px 4px 0' }}>{pkt.protocol}</td>
                  <td style={{ padding: '4px 0  4px 0', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pkt.info}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Packet detail panel */}
      {selected !== null && (() => {
        const pkt = data[selected]
        if (!pkt) return null
        const tagId = `net_${pkt.id ?? selected}`
        const tagName = `${pkt.protocol} ${pkt.src} → ${pkt.dst}`
        const tagged = isTagged(pkt, selected)
        return (
          <div style={{
            width: '260px', flexShrink: 0,
            borderLeft: '1px solid var(--border-dim)',
            padding: '12px', overflowY: 'auto',
            background: 'var(--bg-raised)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontSize: '11px', color: pkt.suspicious ? 'var(--amber-main)' : 'var(--text-primary)', fontWeight: 700 }}>
                Packet #{selected + 1}
              </div>
              <button
                className={`btn-tag ${tagged ? 'tagged' : ''}`}
                onClick={() => tagEvidence({
                  id: tagId,
                  name: tagName,
                  type: 'network',
                  note: pkt.suspicious ? `⚠ ${pkt.info}` : '',
                  path: `NET:${pkt.time}`,
                })}
              >
                <Tag size={9} />
                {tagged ? 'Tagged' : 'Tag'}
              </button>
            </div>

            <table className="ft" style={{ fontSize: '10px' }}>
              <tbody>
                {[
                  ['Time', pkt.time],
                  ['Source', pkt.src],
                  ['Dest', pkt.dst],
                  ['Protocol', pkt.protocol],
                  ['Flags', pkt.suspicious ? '⚠ SUSPICIOUS' : '—'],
                ].map(([k, v]) => (
                  <tr key={k} className={k === 'Flags' && pkt.suspicious ? 'anomaly' : ''}>
                    <td className="k">{k}</td><td className="v">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 10, fontSize: '10px', color: pkt.suspicious ? 'var(--amber-main)' : 'var(--text-secondary)', lineHeight: 1.6 }}>
              {pkt.info}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function EmptyPanel({ msg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{msg}</span>
    </div>
  )
}

function resolvePathNode(root, path) {
  const cleaned = path.replace(/\/$/g, '').replace(/\\/g, '/')
  const segments = cleaned.split('/').filter(Boolean)
  let current = root
  for (const seg of segments) {
    if (!current.children) return null
    const child = current.children[seg]
      ?? Object.values(current.children).find(c => c.name.toLowerCase() === seg.toLowerCase())
    if (!child) return null
    current = child
  }
  return current
}

function findFileByName(node, name) {
  if (!node) return null
  if (node.type === 'file' && node.name.toLowerCase() === name.toLowerCase()) return node
  if (node.children) {
    for (const child of Object.values(node.children)) {
      const found = findFileByName(child, name)
      if (found) return found
    }
  }
  return null
}

function findFileByInode(node, inode) {
  if (!node) return null
  if (node.metadata?.inode === inode) return node
  if (node.children) {
    for (const child of Object.values(node.children)) {
      const found = findFileByInode(child, inode)
      if (found) return found
    }
  }
  return null
}

function fakeHash(seed, len) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  const chars = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < len; i++) { h = (Math.imul(1664525, h) + 1013904223) | 0; out += chars[(h >>> 0) % 16] }
  return out
}

function magicBytesLabel(magic) {
  const m = (magic ?? '').replace(/\s/g, '').toUpperCase()
  if (m.startsWith('504B0304')) return 'ZIP / Office Open XML (docx, xlsx, pptx)'
  if (m.startsWith('25504446')) return 'PDF document'
  if (m.startsWith('89504E47')) return 'PNG image'
  if (m.startsWith('FFD8FF')) return 'JPEG image'
  if (m.startsWith('456C6646')) return 'Windows Event Log (.evtx)'
  if (m.startsWith('4D5A')) return 'Windows PE executable'
  if (m.startsWith('4045')) return 'Batch script / text file'
  return 'unknown format'
}
