import { useState, useRef, useEffect } from 'react'

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT_V1 = `You are Mechanic Marketing HQ — the internal content brain and strategic voice of Mechanic Marketing, a Done-With-You (DWY) digital marketing consultancy for Australian trade businesses.

You produce client-ready content, strategy documents, and marketing deliverables that sound exactly like Mechanic Marketing writes — not like a generic marketing agency.

BEFORE YOU WRITE ANYTHING
Silently confirm the brief makes sense. If critical information is missing, ask up to 3 targeted questions. Do not guess and pad. Do not include any preamble, planning notes, or "before writing" summary in your output — go straight into the deliverable.

WHO MECHANIC MARKETING IS
Mechanic Marketing is a Done-With-You digital marketing consultancy for Australian trade businesses — mechanics, electricians, plumbers, builders, and other service-based trades. We work alongside business owners and in-house admin staff — teaching, guiding, and building alongside them.

We are not a full-service agency. Our value is in making marketing clearer, smarter, and more executable for the tradespeople and small business owners actually running the show.

HOW MECHANIC MARKETING WRITES
The tone: Direct, practical, and zero-fluff. Write like someone who's seen too many dodgy marketing agencies burn tradies and genuinely wants to help. Not preachy. Not salesy. Just honest.

Sentence rhythm: Use short sentences as beats. Break complex ideas across multiple short lines.
SOUNDS LIKE: "You're running ads. You're getting clicks. But no calls. That's a landing page problem, not an ads problem."
NOT LIKE: "When trade businesses implement digital marketing strategies, various factors may contribute to lead generation challenges."

How to open: Lead with the problem or blunt observation. No throat-clearing. No "In today's competitive landscape."
SOUNDS LIKE: "Most tradies are brilliant at their craft and terrible at their marketing."
NOT LIKE: "In this article, we'll explore the key marketing considerations for trade businesses."

Name problems directly:
SOUNDS LIKE: "That's not a Google Ads problem. That's a website problem."
NOT LIKE: "There are a number of factors that may be contributing to underperformance."

CTAs — specific and named:
SOUNDS LIKE: "Book a free 20-minute audit. We'll look at your ads account and tell you exactly what's leaking money."
NOT LIKE: "Get in touch to find out how we can help."

WHAT MECHANIC MARKETING NEVER DOES
- Never open with "Sure!", "Great question!", or any filler
- Never use em dashes (—) in copy
- Never use: leverage, synergy, omnichannel, holistic, robust, cutting-edge, game-changer
- Never use American spelling: optimise not optimize, colour not color, behaviour not behavior
- Never write in a way that could belong to any generic marketing agency
- Never pad to hit a word count

BLOG STRUCTURE
H1: Provocative and specific. Makes a tradie feel seen or slightly called out.
Opening: Lead with the frustration or blunt truth. No preamble.
Key summary block: Short bullet list of takeaways for posts over 800 words.
H2 sections: Each addresses one specific sub-problem. Named directly.
Body: Short paragraphs. Max 3-4 lines before a break.
Closing: Summarise the core truth plainly, then CTA.
CTA: Specific. Names the product or next action.
Meta title: Under 60 characters. Lead with the most important keyword.
Meta description: Under 160 characters. Reads like a blunt one-sentence pitch.`

// ─── QA Rules ─────────────────────────────────────────────────────────────────

const BANNED_WORDS = [
  { word: 'leverage', label: 'Banned word: leverage' },
  { word: 'synergy', label: 'Banned word: synergy' },
  { word: 'omnichannel', label: 'Banned word: omnichannel' },
  { word: 'holistic', label: 'Banned word: holistic' },
  { word: 'robust', label: 'Banned word: robust' },
  { word: 'cutting-edge', label: 'Banned word: cutting-edge' },
  { word: 'game-changer', label: 'Banned word: game-changer' },
  { word: 'optimize', label: 'American spelling: optimize → optimise' },
  { word: 'color', label: 'American spelling: color → colour' },
  { word: 'behavior', label: 'American spelling: behavior → behaviour' },
  { word: 'realize', label: 'American spelling: realize → realise' },
  { word: 'analyze', label: 'American spelling: analyze → analyse' },
  { word: 'prioritize', label: 'American spelling: prioritize → prioritise' },
]

const QA_PATTERNS = [
  { pattern: /^sure[!,]/im, label: 'Filler opener: "Sure!"', severity: 'error' as const },
  { pattern: /great question/i, label: 'Filler phrase: "Great question"', severity: 'error' as const },
  { pattern: /in today's.*landscape/i, label: "Cliché opener: in today's landscape", severity: 'error' as const },
  { pattern: / — /g, label: 'Em dash used — replace with full stop or restructure', severity: 'error' as const },
  { pattern: /many businesses make the mistake/i, label: 'Passive problem framing — name it directly', severity: 'warning' as const },
  { pattern: /it's important to (note|remember|consider)/i, label: 'Weak framing — lead with the point', severity: 'warning' as const },
  { pattern: /in (this|the following) (blog|article|post),? (we will|we'll|i will|i'll) (explore|discuss|look at|cover)/i, label: 'Table-setting opener — lead with the point instead', severity: 'error' as const },
]

function runQA(text: string, contentType = 'blog') {
  const flags: { type: 'error' | 'warning'; label: string; detail: string }[] = []
  const passed: string[] = []
  const lower = text.toLowerCase()

  for (const { word, label } of BANNED_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      flags.push({ type: 'error', label, detail: `Found "${word}" — remove or replace.` })
    }
  }
  if (!flags.some(f => f.label.includes('Banned') || f.label.includes('American'))) {
    passed.push('No banned words or American spellings found')
  }

  for (const { pattern, label, severity } of QA_PATTERNS) {
    const match = text.match(pattern)
    if (match) flags.push({ type: severity, label, detail: `Found: "${match[0].trim()}"` })
  }

  if (contentType === 'blog') {
    if (/^#\s.+/m.test(text)) passed.push('Has H1 heading')
    else flags.push({ type: 'warning', label: 'No H1 found', detail: 'Blog should open with a clear H1.' })

    if (/meta title:/i.test(text)) passed.push('Meta title included')
    else flags.push({ type: 'warning', label: 'Meta title missing', detail: 'Include a meta title under 60 characters.' })

    if (/meta description:/i.test(text)) passed.push('Meta description included')
    else flags.push({ type: 'warning', label: 'Meta description missing', detail: 'Include a meta description under 160 characters.' })

    if (/(book a|book your|get in touch|reach out|read the full)/i.test(text)) passed.push('CTA detected')
    else flags.push({ type: 'warning', label: 'No clear CTA found', detail: 'Every blog should end with a specific call to action.' })
  }

  return {
    score: Math.max(0, 100 - flags.filter(f => f.type === 'error').length * 15 - flags.filter(f => f.type === 'warning').length * 5),
    flags,
    passed,
  }
}

// ─── Content cleanup ──────────────────────────────────────────────────────────

function cleanContent(text: string) {
  return text
    .replace(/^\*{0,2}BEFORE WRITING[:\*]*[\s\S]*?^---\s*\n/im, '')
    .replace(/^\*{0,2}Before (writing|I write)[:\*]*[\s\S]*?^---\s*\n/im, '')
    .trimStart()
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function copyWithFormatting(text: string) {
  const lines = text.split('\n')
  let html = '<div style="font-family: Georgia, serif; font-size: 14px; line-height: 1.8; color: #1C1A14; max-width: 680px;">'
  for (const line of lines) {
    const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (line.startsWith('# ')) html += `<h1 style="font-family: Arial, sans-serif; font-size: 26px; font-weight: 700; color: #1C1A14; margin: 0 0 16px;">${esc.slice(2)}</h1>`
    else if (line.startsWith('## ')) html += `<h2 style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 700; color: #1C1A14; margin: 28px 0 12px;">${esc.slice(3)}</h2>`
    else if (line.startsWith('### ')) html += `<h3 style="font-family: Arial, sans-serif; font-size: 16px; font-weight: 600; color: #1C1A14; margin: 20px 0 8px;">${esc.slice(4)}</h3>`
    else if (line.startsWith('- ')) html += `<li style="margin-bottom: 6px;">${esc.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`
    else if (line.trim() === '') html += '<br>'
    else html += `<p style="margin: 0 0 10px;">${esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</p>`
  }
  html += '</div>'
  const htmlBlob = new Blob([html], { type: 'text/html' })
  const textBlob = new Blob([text], { type: 'text/plain' })
  navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })])
}

function downloadRtf(text: string, title: string) {
  const lines = text.split('\n')
  let rtf = '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Georgia;}{\\f1 Arial;}}{\\colortbl ;\\red28\\green26\\blue20;}\\widowctrl\\hyphauto\n'
  for (const line of lines) {
    const esc = line.replace(/[\\{}]/g, c => `\\${c}`)
    if (line.startsWith('# ')) rtf += `\\pard\\sb300\\sa200\\f1\\b\\fs44\\cf1 ${esc.slice(2)}\\b0\\f0\\fs24\\cf0\\par\n`
    else if (line.startsWith('## ')) rtf += `\\pard\\sb240\\sa120\\f1\\b\\fs32\\cf1 ${esc.slice(3)}\\b0\\f0\\fs24\\cf0\\par\n`
    else if (line.startsWith('### ')) rtf += `\\pard\\sb200\\sa100\\f1\\b\\fs28 ${esc.slice(4)}\\b0\\f0\\fs24\\par\n`
    else if (line.startsWith('- ')) rtf += `\\pard\\li360\\fi-180\\sb60 \\bullet  ${esc.slice(2)}\\par\n`
    else if (line.trim() === '') rtf += `\\pard\\sb120\\par\n`
    else rtf += `\\pard\\sb80\\sa80\\f0\\fs24 ${esc.replace(/\*\*(.+?)\*\*/g, '\\b $1\\b0 ').replace(/\*(.+?)\*/g, '\\i $1\\i0 ')}\\par\n`
  }
  rtf += '}'
  const blob = new Blob([rtf], { type: 'application/rtf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.rtf`
  a.click()
  URL.revokeObjectURL(url)
}

function openInGoogleDocs(text: string, title: string) {
  const lines = text.split('\n')
  let html = '<html><body><div style="font-family: Arial, sans-serif; font-size: 11pt; color: #1C1A14;">'
  for (const line of lines) {
    const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (line.startsWith('# ')) html += `<h1 style="font-size: 20pt; font-weight: bold; color: #1C1A14; margin: 18pt 0 6pt;">${esc.slice(2)}</h1>`
    else if (line.startsWith('## ')) html += `<h2 style="font-size: 15pt; font-weight: bold; color: #1C1A14; margin: 14pt 0 4pt;">${esc.slice(3)}</h2>`
    else if (line.startsWith('### ')) html += `<h3 style="font-size: 12pt; font-weight: bold; margin: 10pt 0 4pt;">${esc.slice(4)}</h3>`
    else if (line.startsWith('- ')) html += `<li style="margin: 3pt 0;">${esc.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`
    else if (line.trim() === '') html += '<p style="margin: 6pt 0;">&nbsp;</p>'
    else html += `<p style="margin: 4pt 0; line-height: 1.6;">${esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</p>`
  }
  html += '</div></body></html>'
  const htmlBlob = new Blob([html], { type: 'text/html' })
  const textBlob = new Blob([text], { type: 'text/plain' })
  navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })])
  window.open('https://docs.google.com/document/create', '_blank')
  title // suppress unused warning
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { value: 'blog', label: 'Blog Post' },
  { value: 'email', label: 'Email' },
  { value: 'facebook_ads', label: 'Facebook Ads Copy' },
  { value: 'google_search', label: 'Google Ads — Search' },
  { value: 'google_pmax', label: 'Google Ads — PMax' },
  { value: 'organic_social', label: 'Organic Social Post' },
  { value: 'social_caption', label: 'Social Caption (with hooks)' },
  { value: 'reel_script', label: 'Reel Script' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'audit', label: 'Audit' },
  { value: 'strategy', label: 'Strategy Doc' },
]

const TABS = ['Generate', 'QA Check', 'Library']

const AUDIENCES = [
  'Mechanics / Auto trades',
  'Electricians',
  'Plumbers',
  'Builders / Construction',
  'Service-based trades',
  'Small business owners',
  'In-house marketers',
  'Other',
]

const GOALS = [
  'Drive leads / enquiries',
  'Build trust / authority',
  'Educate the audience',
  'Promote a service or offer',
  'Other',
]

// ─── Colours ──────────────────────────────────────────────────────────────────

const c = {
  navy: '#1C1A14',
  navyBorder: 'rgba(255,255,255,0.08)',
  offwhite: '#F2F1ED',
  orange: '#FF7A35',
  steel: '#7EC8E3',
  yellow: '#F4F7A6',
  red: '#FF8FAB',
  white: '#FFFFFF',
  text: '#1C1A14',
  muted: '#6B6660',
  border: '#E2E0DA',
  paper: '#F8F7F3',
}

const TYPE_COLORS: Record<string, string> = {
  blog: c.steel,
  email: c.orange,
  facebook_ads: c.red,
  google_search: c.yellow,
  google_pmax: c.yellow,
  organic_social: c.steel,
  social_caption: c.steel,
  reel_script: c.red,
  carousel: c.orange,
  audit: c.red,
  strategy: c.orange,
}

const TYPE_LABELS: Record<string, string> = {
  blog: 'Blog', email: 'Email', facebook_ads: 'FB Ads', google_search: 'G Search',
  google_pmax: 'PMax', organic_social: 'Organic', social_caption: 'Caption',
  reel_script: 'Reel', carousel: 'Carousel', audit: 'Audit', strategy: 'Strategy',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const font = { fontFamily: "'Inter', system-ui, sans-serif" }

const labelStyle: React.CSSProperties = {
  ...font, display: 'block', fontWeight: 600, fontSize: 10,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.45)', marginBottom: 6,
}

const darkInput: React.CSSProperties = {
  ...font, width: '100%', background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)', color: c.white,
  fontSize: 13, padding: '9px 12px', borderRadius: 8,
  outline: 'none', boxSizing: 'border-box',
}

const lightInput: React.CSSProperties = {
  ...font, width: '100%', background: c.white,
  border: `1px solid ${c.border}`, color: c.text,
  fontSize: 13, padding: '9px 12px', borderRadius: 8,
  outline: 'none', boxSizing: 'border-box',
}

const btn = (bg: string, fg: string): React.CSSProperties => ({
  ...font, background: bg, color: fg, border: 'none', borderRadius: 8,
  padding: '8px 16px', fontWeight: 600, fontSize: 11,
  letterSpacing: '0.06em', textTransform: 'uppercase',
  cursor: 'pointer', whiteSpace: 'nowrap',
})

const tag = (bg: string, fg: string): React.CSSProperties => ({
  ...font, display: 'inline-block', background: bg, color: fg,
  borderRadius: 20, padding: '2px 10px', fontWeight: 600,
  fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
})

// ─── Logo ─────────────────────────────────────────────────────────────────────

function MMLogo({ size = 36, color = '#FFFFFF' }: { size?: number; color?: string }) {
  // Wrench/spanner icon
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M28.5 7.5C26.1 5.1 22.7 4.2 19.6 5.1L23.5 9L21 11.5L17.1 7.6C16.2 10.7 17.1 14.1 19.5 16.5C21.7 18.7 24.8 19.7 27.7 19.1L33.4 24.8C34.2 25.6 34.2 26.9 33.4 27.7L30.7 30.4C29.9 31.2 28.6 31.2 27.8 30.4L22.1 24.7C21.5 27.6 20.5 30.7 18.3 32.9C13.9 37.3 6.7 37.3 2.3 32.9C-2.1 28.5 -0.1 21.3 4.3 16.9C6.5 14.7 9.6 13.7 12.5 14.3L7.6 19.2C6.8 20 6.8 21.3 7.6 22.1L14.1 28.6C14.9 29.4 16.2 29.4 17 28.6L17 28.6C17.8 27.8 17.8 26.5 17 25.7L10.5 19.2L13.2 16.5L19.7 23C20.5 23.8 21.8 23.8 22.6 23L22.6 23C23.4 22.2 23.4 20.9 22.6 20.1L16.1 13.6C15.5 10.7 16.5 7.6 18.7 5.4C21.1 3 24.5 2.1 27.6 3L23.7 6.9L26.4 9.6L30.3 5.7C30.9 6.3 31.3 7 31.5 7.8L28.5 7.5Z"
        fill={color}
      />
      <circle cx="27" cy="27" r="3" fill={color} opacity="0.7" />
    </svg>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QAScore({ score }: { score: number }) {
  const bg = score >= 80 ? c.orange : score >= 60 ? c.yellow : c.red
  return (
    <span style={{ ...tag(bg, c.navy), fontSize: 11, padding: '3px 12px' }}>
      {score}/100 — {score >= 80 ? 'Ready' : score >= 60 ? 'Needs fixes' : 'Needs work'}
    </span>
  )
}

function ExportMenu({ text, topic }: { text: string; topic?: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const options = [
    {
      label: copied ? '✓ Copied!' : 'Copy with formatting',
      sub: 'Paste into Word, Notion, Docs',
      accent: c.steel,
      action: () => { copyWithFormatting(text); setCopied(true); setTimeout(() => { setCopied(false); setOpen(false) }, 2000) },
    },
    {
      label: 'Download as .rtf',
      sub: 'Opens in Word or Pages',
      accent: c.orange,
      action: () => { downloadRtf(text, topic || 'mm-output'); setOpen(false) },
    },
    {
      label: 'Open in Google Docs',
      sub: 'Copies formatted content + opens new Doc — just paste',
      accent: c.red,
      action: () => { openInGoogleDocs(text, topic || 'Mechanic Marketing Output'); setOpen(false) },
    },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={btn(c.navy, c.white)}>Export ▾</button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: c.white, border: `1px solid ${c.border}`, borderRadius: 12,
          boxShadow: '0 8px 32px rgba(28,26,20,0.14)', minWidth: 230, zIndex: 200, overflow: 'hidden',
        }}>
          {options.map(({ label, sub, accent, action }) => (
            <button key={label} onClick={action} style={{
              width: '100%', textAlign: 'left', padding: '12px 16px',
              background: 'transparent', border: 'none',
              borderLeft: `3px solid ${accent}`, borderBottom: `1px solid ${c.border}`,
              cursor: 'pointer', display: 'block',
            }}>
              <div style={{ ...font, fontWeight: 600, fontSize: 12, color: c.text }}>{label}</div>
              <div style={{ ...font, fontSize: 11, color: c.muted, marginTop: 2 }}>{sub}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ContentRenderer({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} style={{ ...font, fontWeight: 700, fontSize: 26, color: c.navy, margin: `${i > 0 ? 32 : 0}px 0 16px`, lineHeight: 1.2 }}>{line.slice(2)}</h1>
        if (line.startsWith('## ')) return <h2 key={i} style={{ ...font, fontWeight: 700, fontSize: 19, color: c.navy, margin: '28px 0 12px', lineHeight: 1.3 }}>{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} style={{ ...font, fontWeight: 600, fontSize: 15, color: c.navy, margin: '20px 0 8px' }}>{line.slice(4)}</h3>
        if (line.startsWith('- ')) return <li key={i} style={{ ...font, fontSize: 14, color: c.text, lineHeight: 1.7, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
        if (line.trim() === '') return <div key={i} style={{ height: 12 }} />
        return <p key={i} style={{ ...font, fontSize: 14, color: c.text, lineHeight: 1.75, margin: '0 0 10px' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>') }} />
      })}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Brief {
  contentType: string
  topic: string
  keywords: string
  wordCount: string
  audience: string
  audienceOther: string
  goal: string
  goalOther: string
  additionalContext: string
  createdBy: string
}

interface LibraryItem {
  id: number
  contentType: string
  topic: string
  audience: string
  goal: string
  content: string
  qaScore: number
  createdBy: string
  date: string
}

interface UploadedFile {
  name: string
  text: string
}

// ─── Welcome / Auth screen ─────────────────────────────────────────────────────

const ACCESS_PASSWORD = import.meta.env.VITE_ACCESS_PASSWORD as string | undefined

function WelcomeScreen({ onAuth }: { onAuth: (name: string) => void }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (ACCESS_PASSWORD && password !== ACCESS_PASSWORD) { setError('Incorrect password.'); return }
    localStorage.setItem('mm_authed', 'true')
    localStorage.setItem('mm_user_name', name.trim())
    onAuth(name.trim())
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: c.navy, ...font, color: c.white,
    }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
          <MMLogo size={44} color={c.white} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
              mechanic <span style={{ color: c.orange }}>hq</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
              Content engine
            </div>
          </div>
        </div>

        {/* Intro */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
            Your AI-powered marketing content tool.
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
            Generate blogs, ads, social posts, and more — written in the Mechanic Marketing voice, ready to review and publish.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Sarah"
              autoFocus
              style={{ ...darkInput, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {ACCESS_PASSWORD && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Enter password"
                style={{ ...darkInput, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: c.red, padding: '8px 12px', background: 'rgba(255,143,171,0.1)', borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button type="submit" style={{ ...btn(c.orange, c.navy), padding: '13px', fontSize: 13, marginTop: 4 }}>
            Get started
          </button>
        </form>

        <div style={{ marginTop: 32, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          Mechanic Marketing &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [isAuthed, setIsAuthed] = useState(() =>
    !ACCESS_PASSWORD ? true : localStorage.getItem('mm_authed') === 'true'
  )

  const [activeTab, setActiveTab] = useState(0)

  // Generate tab state
  const [brief, setBrief] = useState<Brief>({
    contentType: 'blog', topic: '', keywords: '', wordCount: '',
    audience: 'Mechanics / Auto trades', audienceOther: '',
    goal: 'Drive leads / enquiries', goalOther: '',
    additionalContext: '', createdBy: localStorage.getItem('mm_user_name') || '',
  })
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [qaScore, setQaScore] = useState<number | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [fileError, setFileError] = useState('')
  const outputRef = useRef<HTMLDivElement>(null)

  // QA tab state
  const [qaText, setQaText] = useState('')
  const [qaType, setQaType] = useState('blog')
  const [qaResult, setQaResult] = useState<ReturnType<typeof runQA> | null>(null)

  // Library state
  const [library, setLibrary] = useState<LibraryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('mm_library') || '[]') } catch { return [] }
  })
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)
  const [libFilter, setLibFilter] = useState('all')
  const [libSearch, setLibSearch] = useState('')

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output])

  const activePrompt = SYSTEM_PROMPT_V1

  // ── Library helpers ──
  const saveToLibrary = (items: LibraryItem[]) => {
    setLibrary(items)
    try { localStorage.setItem('mm_library', JSON.stringify(items)) } catch { }
  }

  // ── File upload ──
  const readFile = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target!.result as string)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsText(file)
  })

  const handleFiles = async (files: FileList) => {
    setFileError('')
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv', 'application/csv']
    const results: UploadedFile[] = []
    for (const file of Array.from(files)) {
      if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|txt|csv)$/i)) {
        setFileError(`${file.name} — unsupported file type. Use PDF, DOCX, TXT or CSV.`); continue
      }
      if (file.size > 5 * 1024 * 1024) { setFileError(`${file.name} is over 5MB.`); continue }
      try {
        const text = await readFile(file)
        results.push({ name: file.name, text: text.slice(0, 12000) })
      } catch { setFileError(`Could not read ${file.name}.`) }
    }
    setUploadedFiles(prev => [...prev, ...results])
  }

  // ── Generate ──
  const generate = async () => {
    if (!brief.topic || !brief.audience || !brief.goal) {
      setError('Topic, audience, and goal are required.'); return
    }
    const audience = brief.audience === 'Other' ? brief.audienceOther || 'Other' : brief.audience
    const goal = brief.goal === 'Other' ? brief.goalOther || 'Other' : brief.goal
    setError(''); setOutput(''); setQaScore(null); setStreaming(true)

    const typeLabel: Record<string, string> = {
      blog: 'blog post', email: 'email', facebook_ads: 'Facebook Ads copy',
      google_search: 'Google Ads Search copy', google_pmax: 'Google Ads Performance Max copy',
      organic_social: 'organic social post', social_caption: 'social media caption with multiple hook options',
      reel_script: 'short-form video reel script with hook, body and CTA',
      carousel: 'social media carousel with individual slide copy',
      audit: 'audit document', strategy: 'strategy document',
    }

    const filesBlock = uploadedFiles.length
      ? `\n\nCLIENT MATERIALS PROVIDED:\n${uploadedFiles.map(f => `--- ${f.name} ---\n${f.text}`).join('\n\n')}`
      : ''

    const userMessage = `Write a ${typeLabel[brief.contentType] || brief.contentType} with the following brief:

Topic: ${brief.topic}
Audience: ${audience}
Goal: ${goal}${brief.keywords ? `\nSEO Keywords: ${brief.keywords}` : ''}${brief.wordCount ? `\nApproximate word count: ${brief.wordCount} words` : ''}${brief.additionalContext ? `\nAdditional context: ${brief.additionalContext}` : ''}${filesBlock}

Go straight into the deliverable. No preamble, no planning notes, no "before writing" section.`

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          system: activePrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'API error')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              accumulated += parsed.delta.text
              setOutput(accumulated)
            }
          } catch { }
        }
      }

      const cleaned = cleanContent(accumulated)
      setOutput(cleaned)
      const score = runQA(cleaned, brief.contentType).score
      setQaScore(score)

      const item: LibraryItem = {
        id: Date.now(),
        contentType: brief.contentType,
        topic: brief.topic,
        audience,
        goal,
        content: cleaned,
        qaScore: score,
        createdBy: brief.createdBy,
        date: new Date().toLocaleDateString('en-AU'),
      }
      saveToLibrary([item, ...library])
    } catch (e: any) {
      setError(e.message || 'Generation failed.')
    } finally {
      setStreaming(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const filteredLibrary = library.filter(item =>
    (libFilter === 'all' || item.contentType === libFilter) &&
    (!libSearch || item.topic?.toLowerCase().includes(libSearch.toLowerCase()) || item.content?.toLowerCase().includes(libSearch.toLowerCase()))
  )

  if (!isAuthed) {
    return <WelcomeScreen onAuth={name => { setCurrentUser(name); setBrief(b => ({ ...b, createdBy: name })); setIsAuthed(true) }} />
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: c.offwhite, ...font, color: c.text, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: c.navy, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <MMLogo size={36} color={c.white} />
            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />
            <div>
              <div style={{ ...font, fontWeight: 700, fontSize: 17, color: c.white, letterSpacing: '-0.01em' }}>
                mechanic <span style={{ color: c.orange }}>hq</span>
              </div>
              <div style={{ ...font, fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>
                Content engine
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[c.steel, c.orange, c.yellow, c.red].map((col, i) => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: col, opacity: 0.65 }} />
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '12px 20px 0', gap: 2 }}>
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)} style={{
              background: activeTab === i ? 'rgba(255,255,255,0.09)' : 'transparent',
              border: 'none', borderBottom: activeTab === i ? `2px solid ${c.orange}` : '2px solid transparent',
              color: activeTab === i ? c.white : 'rgba(255,255,255,0.45)',
              ...font, fontWeight: 600, fontSize: 11, letterSpacing: '0.08em',
              textTransform: 'uppercase', padding: '6px 16px 12px', cursor: 'pointer', borderRadius: '6px 6px 0 0',
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* ── Tab 0: Generate ── */}
      {activeTab === 0 && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Sidebar */}
          <div style={{ width: 300, flexShrink: 0, background: c.navy, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...font, fontWeight: 700, fontSize: 11, color: c.orange, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Brief</div>

            {/* Content Type */}
            <div>
              <label style={labelStyle}>Content Type</label>
              <select value={brief.contentType} onChange={e => setBrief(b => ({ ...b, contentType: e.target.value }))}
                style={{ ...darkInput, appearance: 'none' }}>
                {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Topic & Keywords */}
            {([
              { lbl: 'Topic *', key: 'topic', ph: 'e.g. Why tradies lose leads from Google Ads' },
              { lbl: 'SEO Keywords', key: 'keywords', ph: 'e.g. tradie Google Ads, electrician lead gen' },
            ] as const).map(({ lbl, key, ph }) => (
              <div key={key}>
                <label style={labelStyle}>{lbl}</label>
                <input type="text" value={brief[key]} onChange={e => setBrief(b => ({ ...b, [key]: e.target.value }))}
                  placeholder={ph} style={darkInput} />
              </div>
            ))}

            {/* Word Count */}
            <div>
              <label style={labelStyle}>Word Count (optional)</label>
              <input type="text" value={brief.wordCount} onChange={e => setBrief(b => ({ ...b, wordCount: e.target.value }))}
                placeholder="e.g. 800" style={darkInput} />
            </div>

            {/* Audience */}
            <div>
              <label style={labelStyle}>Audience *</label>
              <select value={brief.audience} onChange={e => setBrief(b => ({ ...b, audience: e.target.value }))}
                style={{ ...darkInput, appearance: 'none' }}>
                {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {brief.audience === 'Other' && (
                <input type="text" value={brief.audienceOther} onChange={e => setBrief(b => ({ ...b, audienceOther: e.target.value }))}
                  placeholder="Describe the audience" style={{ ...darkInput, marginTop: 8 }} />
              )}
            </div>

            {/* Goal */}
            <div>
              <label style={labelStyle}>Goal *</label>
              <select value={brief.goal} onChange={e => setBrief(b => ({ ...b, goal: e.target.value }))}
                style={{ ...darkInput, appearance: 'none' }}>
                {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {brief.goal === 'Other' && (
                <input type="text" value={brief.goalOther} onChange={e => setBrief(b => ({ ...b, goalOther: e.target.value }))}
                  placeholder="Describe the goal" style={{ ...darkInput, marginTop: 8 }} />
              )}
            </div>

            {/* Additional Context */}
            <div>
              <label style={labelStyle}>Additional Context</label>
              <textarea value={brief.additionalContext} onChange={e => setBrief(b => ({ ...b, additionalContext: e.target.value }))}
                placeholder="Extra context, client info, tone notes..."
                style={{ ...darkInput, resize: 'none', minHeight: 80, lineHeight: 1.6 }} />
            </div>

            {/* File Upload */}
            <div>
              <label style={labelStyle}>Attach Files</label>
              <label style={{
                display: 'block', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 8,
                padding: '10px 12px', cursor: 'pointer', textAlign: 'center',
                color: 'rgba(255,255,255,0.4)', fontSize: 11, ...font,
              }}>
                <input type="file" multiple accept=".pdf,.docx,.txt,.csv" style={{ display: 'none' }}
                  onChange={e => e.target.files && handleFiles(e.target.files)} />
                Drop or click to add PDF, DOCX, TXT, CSV
              </label>
              {fileError && <div style={{ ...font, fontSize: 11, color: c.red, marginTop: 4 }}>{fileError}</div>}
              {uploadedFiles.map(f => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ ...font, fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <button onClick={() => setUploadedFiles(prev => prev.filter(x => x.name !== f.name))}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>×</button>
                </div>
              ))}
            </div>

            {/* Created By */}
            <div>
              <label style={labelStyle}>Your name</label>
              <input type="text" value={brief.createdBy} onChange={e => setBrief(b => ({ ...b, createdBy: e.target.value }))}
                placeholder="Your name" style={darkInput} />
            </div>

            {error && <div style={{ ...font, fontSize: 12, color: c.red, padding: '8px 12px', background: 'rgba(255,143,171,0.1)', borderRadius: 8 }}>{error}</div>}

            <button onClick={generate} disabled={streaming} style={{
              ...btn(streaming ? 'rgba(255,255,255,0.08)' : c.orange, streaming ? 'rgba(255,255,255,0.3)' : c.navy),
              padding: '12px', fontSize: 12, marginTop: 4,
            }}>
              {streaming ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {/* Output panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: c.paper }}>
            {/* Output toolbar */}
            <div style={{
              background: c.white, borderBottom: `1px solid ${c.border}`,
              padding: '10px 24px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {brief.contentType && (
                  <span style={tag(TYPE_COLORS[brief.contentType] || c.steel, c.navy)}>
                    {TYPE_LABELS[brief.contentType] || brief.contentType}
                  </span>
                )}
                {qaScore !== null && <QAScore score={qaScore} />}
                {streaming && <span style={{ ...font, fontSize: 11, color: c.muted }}>QA runs automatically.</span>}
              </div>
              {output && <ExportMenu text={output} topic={brief.topic} />}
            </div>

            {/* Output body */}
            <div ref={outputRef} style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
              {output ? (
                <ContentRenderer text={output} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <MMLogo size={48} color={c.border} />
                    <p style={{ ...font, color: c.muted, marginTop: 16, fontSize: 13 }}>
                      Fill in the brief and hit Generate.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 1: QA Check ── */}
      {activeTab === 1 && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 14, overflow: 'hidden', background: c.paper }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <h2 style={{ ...font, margin: 0, fontWeight: 700, fontSize: 16, color: c.navy }}>QA Checker</h2>
              <select value={qaType} onChange={e => { setQaType(e.target.value); setQaResult(null) }}
                style={{ ...lightInput, width: 'auto' }}>
                {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button onClick={() => { if (qaText.trim()) setQaResult(runQA(qaText, qaType)) }}
                disabled={!qaText.trim()}
                style={{ ...btn(c.navy, c.white), opacity: qaText.trim() ? 1 : 0.4 }}>
                Run Check
              </button>
            </div>
            <textarea value={qaText} onChange={e => { setQaText(e.target.value); setQaResult(null) }}
              placeholder="Paste any content here..."
              style={{ flex: 1, ...lightInput, resize: 'none', padding: 20, lineHeight: 1.8 }} />
          </div>

          {/* QA Results panel */}
          <div style={{ width: 320, flexShrink: 0, background: c.navy, overflowY: 'auto', padding: 24 }}>
            {qaResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...font, fontWeight: 700, fontSize: 11, color: c.orange, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Score</span>
                  <QAScore score={qaResult.score} />
                </div>

                {qaResult.flags.length > 0 && (
                  <div>
                    <div style={{ ...font, fontWeight: 700, fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Issues</div>
                    {qaResult.flags.map((f, i) => (
                      <div key={i} style={{
                        background: f.type === 'error' ? 'rgba(255,143,171,0.1)' : 'rgba(244,247,166,0.08)',
                        border: `1px solid ${f.type === 'error' ? 'rgba(255,143,171,0.25)' : 'rgba(244,247,166,0.2)'}`,
                        borderRadius: 8, padding: '10px 12px', marginBottom: 8,
                      }}>
                        <div style={{ ...font, fontSize: 11, fontWeight: 600, color: f.type === 'error' ? c.red : c.yellow }}>{f.label}</div>
                        <div style={{ ...font, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{f.detail}</div>
                      </div>
                    ))}
                  </div>
                )}

                {qaResult.passed.length > 0 && (
                  <div>
                    <div style={{ ...font, fontWeight: 700, fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Passed</div>
                    {qaResult.passed.map((p, i) => (
                      <div key={i} style={{ ...font, fontSize: 11, color: 'rgba(255,255,255,0.5)', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        ✓ {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ ...font, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: 13 }}>
                Paste content and run the check.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Library ── */}
      {activeTab === 2 && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Library sidebar */}
          <div style={{ width: 300, flexShrink: 0, background: c.navy, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.navyBorder}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="text" value={libSearch} onChange={e => setLibSearch(e.target.value)}
                placeholder="Search..." style={darkInput} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[{ value: 'all', label: 'All' }, ...CONTENT_TYPES.map(t => ({ value: t.value, label: TYPE_LABELS[t.value] }))].map(({ value, label }) => (
                  <button key={value} onClick={() => setLibFilter(value)} style={{
                    ...font, fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
                    textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
                    border: 'none', cursor: 'pointer',
                    background: libFilter === value ? c.orange : 'rgba(255,255,255,0.07)',
                    color: libFilter === value ? c.navy : 'rgba(255,255,255,0.5)',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredLibrary.length === 0 ? (
                <p style={{ ...font, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: 12, padding: 20 }}>
                  No items yet. Generate some content first.
                </p>
              ) : filteredLibrary.map(item => (
                <button key={item.id} onClick={() => setSelectedItem(item)} style={{
                  width: '100%', textAlign: 'left', padding: '14px 20px',
                  background: selectedItem?.id === item.id ? 'rgba(255,255,255,0.07)' : 'transparent',
                  borderLeft: selectedItem?.id === item.id ? `3px solid ${c.orange}` : '3px solid transparent',
                  borderRight: 'none', borderTop: 'none', borderBottom: `1px solid ${c.navyBorder}`,
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={tag(TYPE_COLORS[item.contentType] || c.steel, c.navy)}>
                      {TYPE_LABELS[item.contentType] || item.contentType}
                    </span>
                    {item.qaScore !== undefined && <QAScore score={item.qaScore} />}
                  </div>
                  <div style={{ ...font, fontSize: 12, fontWeight: 600, color: c.white, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.topic || 'Untitled'}
                  </div>
                  <div style={{ ...font, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                    {item.createdBy} · {item.date}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Library content view */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: c.paper }}>
            {selectedItem ? (
              <>
                <div style={{
                  background: c.white, borderBottom: `1px solid ${c.border}`,
                  padding: '10px 24px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={tag(TYPE_COLORS[selectedItem.contentType] || c.steel, c.navy)}>
                      {TYPE_LABELS[selectedItem.contentType] || selectedItem.contentType}
                    </span>
                    <QAScore score={selectedItem.qaScore} />
                    <span style={{ ...font, fontSize: 11, color: c.muted }}>{selectedItem.createdBy} · {selectedItem.date}</span>
                  </div>
                  <ExportMenu text={selectedItem.content} topic={selectedItem.topic} />
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
                  <ContentRenderer text={selectedItem.content} />
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ ...font, color: c.muted, fontStyle: 'italic' }}>Select an output.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
