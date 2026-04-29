import { Link } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import {
  Zap, Github, ArrowRight, Network, ShieldAlert, Tags,
  Target, Terminal, BookOpen, Calendar, MessageCircle,
  Menu, X, Code2, Database, Cpu, GitBranch,
  FileCode, Users, Route, Settings2, Briefcase, GitPullRequest, FileText, ArrowUpRight, Ghost, DollarSign
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Human-level feature descriptions
const features = [
  {
    id: 'zombie',
    icon: Ghost, color: 'text-purple-600', bg: 'bg-purple-50',
    label: 'Zombie Code Exterminator',
    shortDesc: 'Statically analyzes your repo to find mathematically unreachable code.',
    longDesc: 'Afraid to delete old code? Our static analyzer maps your execution paths to find dead functions, unused endpoints, and orphaned files. It proves why the code can be safely deleted.'
  },
  {
    id: 'migration',
    icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50',
    label: 'Migration Risk Analyzer',
    shortDesc: 'Predict database downtime and table locks before you run migrations.',
    longDesc: 'Adding a column to a 10M row table without a concurrent index will lock your database. We analyze your migration schemas and SQL to warn you of downtime risks before they reach production.'
  },
  {
    id: 'cost',
    icon: DollarSign, color: 'text-brand-600', bg: 'bg-brand-50',
    label: 'Cloud Cost Optimizer',
    shortDesc: 'Detect N+1 queries and compute-heavy loops before they spike your cloud bill.',
    longDesc: 'Inefficient ORM queries work fine locally but cost a fortune on AWS. RepoNexus flags N+1 queries, memory leaks, and oversized data fetches, suggesting optimized SQL or batching strategies.'
  },
  { 
    id: 'pr',
    icon: GitPullRequest, color: 'text-orange-600', bg: 'bg-orange-50', 
    label: 'PR Reviewer',
    shortDesc: 'Automated code review, bug detection, and plain-English PR summaries.',
    longDesc: 'Code reviews usually suck up your afternoon. RepoNexus reads the diff like a senior engineer, catching logic bugs and security flaws so you can just click approve with confidence. It even writes a plain-English summary of what changed.'
  },
  { 
    id: 'chat',
    icon: MessageCircle,  color: 'text-cyan-600',   bg: 'bg-cyan-50',   
    label: 'Code Chat',
    shortDesc: 'Ask anything about your codebase and get accurate, grounded answers.',
    longDesc: 'Navigating a new codebase is daunting. Instead of hunting through files, just ask RepoNexus: "Where is auth handled?" or "How do I add a new endpoint?" It reads your file tree and gives you exact, grounded answers.'
  },
  { 
    id: 'notes',
    icon: FileText,       color: 'text-sky-600',    bg: 'bg-sky-50',    
    label: 'Release Notes',
    shortDesc: 'Turn messy commits into professional, categorised markdown changelogs.',
    longDesc: 'Nobody likes writing release notes. We take your last 30 days of messy, unformatted commits and turn them into a beautiful, categorized changelog perfect for your next product update.'
  },
  { 
    id: 'interview',
    icon: Target,         color: 'text-violet-600', bg: 'bg-violet-50',  
    label: 'Interview Prep',
    shortDesc: 'AI-generated questions from your actual codebase.',
    longDesc: 'Generic LeetCode questions don\'t help you pass the onsite. We scan your actual project code and generate the exact architecture and logic questions an interviewer would ask about your work.'
  },
  { 
    id: 'diagrams',
    icon: Network,        color: 'text-blue-600',   bg: 'bg-blue-50',    
    label: 'Architecture Diagrams',
    shortDesc: 'Auto-generate Mermaid.js system diagrams from your repo in seconds.',
    longDesc: 'A picture is worth a thousand lines of code. Instantly visualize your repository\'s component structure and dependencies to help onboard new hires or plan your next refactor.'
  },
  { 
    id: 'security',
    icon: ShieldAlert,    color: 'text-red-600',    bg: 'bg-red-50',     
    label: 'Security Audit',
    shortDesc: 'Detect CVEs, exposed secrets and outdated packages.',
    longDesc: 'Don\'t let a leaked key ruin your weekend. We proactively scan your dependency files and codebase for known vulnerabilities and exposed secrets before they reach production.'
  },
  { 
    id: 'tutor',
    icon: BookOpen,       color: 'text-pink-600',   bg: 'bg-pink-50',    
    label: 'Code Tutor',
    shortDesc: 'Detailed optimization lessons with Big-O analysis.',
    longDesc: 'Writing code is one thing; writing efficient code is another. Highlight any messy function, and we\'ll break down its Big-O complexity and teach you how to optimize it like a pro.'
  },

  { 
    id: 'setup',
    icon: Terminal,       color: 'text-emerald-600',bg: 'bg-emerald-50', 
    label: 'Local Setup Guide',
    shortDesc: 'Generate onboarding docs from package files — get running fast.',
    longDesc: '"Works on my machine" is dead. We analyze your package.json, requirements.txt, or Dockerfiles to write a foolproof, step-by-step local setup guide for the next developer joining your team.'
  },
  {
    id: 'triage',
    icon: Tags,           color: 'text-amber-700',  bg: 'bg-amber-50',
    label: 'Issue Triage',
    shortDesc: 'Story-point estimates and prioritisation for every open GitHub issue.',
    longDesc: 'Backlog refinement takes hours. We instantly analyze all open issues in your repo and use AI to estimate story points and flag the ones that are actually high-priority.'
  },
  {
    id: 'standup',
    icon: Calendar,       color: 'text-brand-600',  bg: 'bg-brand-50',
    label: 'Daily Standup',
    shortDesc: 'Auto-generate your standup report from the last N days of commits.',
    longDesc: 'Can\'t remember what you did yesterday? RepoNexus summarizes your commit history into a concise, professional update ready to paste into your team\'s Slack channel.'
  },
  {
    id: 'readme',
    icon: FileCode,       color: 'text-zinc-600',   bg: 'bg-zinc-100',
    label: 'README Generator',
    shortDesc: 'Generate a publication-quality README.md from your repo structure.',
    longDesc: 'First impressions matter. We analyze your entire project structure and generate a beautiful, comprehensive README complete with installation steps, usage examples, and badges.'
  },
  {
    id: 'contributing',
    icon: Users,          color: 'text-teal-600',   bg: 'bg-teal-50',
    label: 'Contributing Guide',
    shortDesc: 'Auto-generate CONTRIBUTING.md with setup, conventions, and PR process.',
    longDesc: 'Make it easy for open-source contributors or new hires to jump in. We document your exact project structure and PR conventions so you don\'t have to answer the same questions twice.'
  },
  {
    id: 'api',
    icon: Route,          color: 'text-indigo-600', bg: 'bg-indigo-50',
    label: 'API Documenter',
    shortDesc: 'Scan route files and produce OpenAPI-style API reference docs.',
    longDesc: 'Keeping API docs in sync with code is impossible. We scan your router files (Express, FastAPI, etc.) and generate accurate, beautiful API references automatically.'
  },
  {
    id: 'cicd',
    icon: Settings2,      color: 'text-sky-600',    bg: 'bg-sky-50',
    label: 'CI/CD Pipeline',
    shortDesc: 'Generate secure GitHub Actions workflows for testing and deployment.',
    longDesc: 'Don\'t waste hours debugging YAML files. We look at your tech stack and generate the exact GitHub Actions workflows you need for linting, testing, and secure deployment.'
  },
  {
    id: 'planner',
    icon: Briefcase,      color: 'text-fuchsia-600',bg: 'bg-fuchsia-50',
    label: 'Issue Planner',
    shortDesc: 'Turn any open issue into a detailed step-by-step implementation plan.',
    longDesc: 'Stuck on a complex bug? Pick an issue, and RepoNexus will break down exactly which files need to change and write a step-by-step implementation plan for you to follow.'
  }
]

const stack = [
  { icon: Code2,     name: 'React 18',         role: 'Frontend',      dot: 'bg-cyan-400' },
  { icon: Zap,       name: 'FastAPI',           role: 'Backend API',   dot: 'bg-emerald-400' },
  { icon: Cpu,       name: 'Groq / Llama 3.3', role: 'LLM Engine',    dot: 'bg-violet-400' },
  { icon: Database,  name: 'LangChain',         role: 'RAG & Chains',  dot: 'bg-amber-400' },
  { icon: GitBranch, name: 'PyGitHub',          role: 'GitHub API',    dot: 'bg-zinc-400' },
  { icon: Database,  name: 'PostgreSQL',        role: 'Database',      dot: 'bg-blue-400' },
]

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState<typeof features[0] | null>(null)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  
  // Carousel refs and motion state
  const row1TrackRef = useRef<HTMLDivElement>(null)
  const row2TrackRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const rowPauseTimeoutRef = useRef<{ row1: number | null; row2: number | null }>({ row1: null, row2: null })
  const isManualScrollingRef = useRef({ row1: false, row2: false })
  const marqueeOffsetRef = useRef({ row1: 0, row2: 0 })
  const marqueeHalfWidthRef = useRef({ row1: 0, row2: 0 })
  const marqueeReadyRef = useRef({ row1: false, row2: false })

  const setMarqueePosition = (row: 'row1' | 'row2', offset: number) => {
    const track = row === 'row1' ? row1TrackRef.current : row2TrackRef.current
    const halfWidth = marqueeHalfWidthRef.current[row]

    if (!track || halfWidth <= 0) return

    const normalizedOffset = ((offset % halfWidth) + halfWidth) % halfWidth
    marqueeOffsetRef.current[row] = normalizedOffset
    track.style.transform = `translate3d(${-normalizedOffset}px, 0, 0)`
  }

  const syncMarqueeSizes = () => {
    const row1Track = row1TrackRef.current
    const row2Track = row2TrackRef.current

    if (row1Track) {
      marqueeHalfWidthRef.current.row1 = row1Track.scrollWidth / 2
      if (!marqueeReadyRef.current.row1 && marqueeHalfWidthRef.current.row1 > 0) {
        marqueeReadyRef.current.row1 = true
        setMarqueePosition('row1', 0)
      } else {
        setMarqueePosition('row1', marqueeOffsetRef.current.row1)
      }
    }

    if (row2Track) {
      marqueeHalfWidthRef.current.row2 = row2Track.scrollWidth / 2
      if (!marqueeReadyRef.current.row2 && marqueeHalfWidthRef.current.row2 > 0) {
        marqueeReadyRef.current.row2 = true
        setMarqueePosition('row2', marqueeHalfWidthRef.current.row2)
        console.log('Row 2 initialized to:', marqueeHalfWidthRef.current.row2)
      } else {
        setMarqueePosition('row2', marqueeOffsetRef.current.row2)
      }
    }
  }

  // Handle carousel wheel events - React event handler
  const handleCarouselWheel = (e: React.WheelEvent, isRow2: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    
    const scrollAmount = 40
    const row = isRow2 ? 'row2' : 'row1'

    if (isRow2) {
      marqueeOffsetRef.current.row2 += (e.deltaY < 0 ? 1 : -1) * scrollAmount
    } else {
      marqueeOffsetRef.current.row1 += (e.deltaY > 0 ? 1 : -1) * scrollAmount
    }
    
    setMarqueePosition(row, marqueeOffsetRef.current[row])
    isManualScrollingRef.current[isRow2 ? 'row2' : 'row1'] = true
    
    const timeoutRow = isRow2 ? 'row2' : 'row1'
    const existingTimeout = rowPauseTimeoutRef.current[timeoutRow]
    if (existingTimeout !== null) {
      window.clearTimeout(existingTimeout)
    }

    rowPauseTimeoutRef.current[timeoutRow] = window.setTimeout(() => {
      isManualScrollingRef.current[isRow2 ? 'row2' : 'row1'] = false
      rowPauseTimeoutRef.current[timeoutRow] = null
    }, 1500)
  }

  // Non-passive wheel event listener for native events
  useEffect(() => {
    const handleWheelNonPassive = (e: WheelEvent) => {
      const target = e.target as HTMLElement
      const carouselContainer = target.closest('[data-carousel-row]')
      
      if (!carouselContainer) return
      
      e.preventDefault()
      e.stopPropagation()
      
      const isRow2 = carouselContainer.getAttribute('data-carousel-row') === '2'
      handleCarouselWheel(e as unknown as React.WheelEvent, isRow2)
    }
    
    window.addEventListener('wheel', handleWheelNonPassive, { passive: false, capture: true })
    
    return () => {
      window.removeEventListener('wheel', handleWheelNonPassive, { capture: true } as any)
    }
  }, [])

  useEffect(() => {
    const sync = () => syncMarqueeSizes()
    const startTimer = window.setTimeout(sync, 100)
    const resizeObserver = new ResizeObserver(sync)

    if (row1TrackRef.current) resizeObserver.observe(row1TrackRef.current)
    if (row2TrackRef.current) resizeObserver.observe(row2TrackRef.current)

    window.addEventListener('resize', sync)

    const speedPerMs = 0.0167
    let lastTimestamp = performance.now()

    const animate = (timestamp: number) => {
      const elapsed = timestamp - lastTimestamp
      lastTimestamp = timestamp

      if (marqueeHalfWidthRef.current.row1 > 0 && !isManualScrollingRef.current.row1) {
        marqueeOffsetRef.current.row1 = marqueeOffsetRef.current.row1 + elapsed * speedPerMs
        setMarqueePosition('row1', marqueeOffsetRef.current.row1)
      }

      if (marqueeHalfWidthRef.current.row2 > 0 && !isManualScrollingRef.current.row2) {
        marqueeOffsetRef.current.row2 = marqueeOffsetRef.current.row2 - elapsed * speedPerMs
        setMarqueePosition('row2', marqueeOffsetRef.current.row2)
      }

      animationFrameRef.current = window.requestAnimationFrame(animate)
    }

    animationFrameRef.current = window.requestAnimationFrame(animate)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', sync)
      window.clearTimeout(startTimer)

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      if (rowPauseTimeoutRef.current.row1 !== null) {
        window.clearTimeout(rowPauseTimeoutRef.current.row1)
        rowPauseTimeoutRef.current.row1 = null
      }

      if (rowPauseTimeoutRef.current.row2 !== null) {
        window.clearTimeout(rowPauseTimeoutRef.current.row2)
        rowPauseTimeoutRef.current.row2 = null
      }
    }
  }, [])

  // Prevent scrolling when modals are open
  useEffect(() => {
    if (activeFeature || isAboutOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [activeFeature, isAboutOpen])

  return (
    <div className="min-h-screen bg-[#FCFAF8] font-sans selection:bg-brand-200" style={{ letterSpacing: '-0.01em' }}>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#FCFAF8]/90 backdrop-blur-md border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <div className="w-8 h-8 rounded-lg bg-surface-900 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="RepoNexus" className="w-8 h-8 object-contain" />
            </div>
            <span className="font-serif italic text-xl text-surface-900 tracking-tight pr-1">RepoNexus</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {['About', 'Features', 'Tech Stack'].map(item => (
              <button
                key={item}
                onClick={() => {
                  if (item === 'About') {
                    setIsAboutOpen(true)
                  } else {
                    document.getElementById(item.toLowerCase().replace(' ', '-'))?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-surface-600 hover:text-surface-900 rounded-md transition-colors"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-surface-600 hover:text-surface-900 px-3 py-2 transition-colors">
              Log in
            </Link>
            <Link to="/login" className="bg-surface-900 text-white hover:bg-surface-800 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              Start analyzing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <button className="md:hidden p-2 rounded-md hover:bg-surface-100" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="w-6 h-6 text-surface-900" /> : <Menu className="w-6 h-6 text-surface-900" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-[#FCFAF8] border-t border-surface-200 px-6 py-6 space-y-2 shadow-xl">
            {['About', 'Features', 'Tech Stack'].map(item => (
              <button
                key={item}
                onClick={() => {
                  setMobileOpen(false)
                  if (item === 'About') {
                    setIsAboutOpen(true)
                  } else {
                    document.getElementById(item.toLowerCase().replace(' ', '-'))?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                className="block w-full text-left px-4 py-3 text-base font-serif italic text-surface-900 rounded-md hover:bg-surface-100"
              >
                {item}
              </button>
            ))}
            <div className="pt-4">
              <Link to="/login" className="flex justify-center bg-surface-900 text-white px-5 py-3 rounded-lg text-base font-medium">Get started free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Editorial Hero ───────────────────────────────────────────────── */}
      <section className="pt-40 pb-24 px-6 relative overflow-hidden">
        {/* Organic background shapes */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#F4F0EB] rounded-full blur-[100px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-50 rounded-full blur-[100px] opacity-60 pointer-events-none translate-y-1/3 -translate-x-1/3" />

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-6xl md:text-8xl font-serif text-surface-900 leading-[1.05] tracking-tight mb-8">
              Code better.<br />
              <span className="italic text-surface-500">Sleep easier.</span>
            </h1>
            <p className="text-lg md:text-xl text-surface-600 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10">
              RepoNexus was built because technical debt shouldn't be a black box. It's a suite of 18 intelligent tools that read your repo like a human engineer would.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/login" className="bg-surface-900 text-white hover:bg-surface-800 px-8 py-4 rounded-xl text-base font-medium transition-all transform hover:-translate-y-0.5 shadow-lg flex items-center gap-2.5">
                <Github className="w-5 h-5" />
                Connect GitHub
              </Link>
              <a href="#features" className="text-surface-600 hover:text-surface-900 font-medium px-6 py-4 flex items-center gap-2 transition-colors">
                Explore the tools <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="flex-1 w-full max-w-lg lg:max-w-none">
            <div className="bg-white p-2 rounded-2xl shadow-2xl border border-surface-200 rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="bg-surface-50 rounded-xl border border-surface-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-3 bg-white">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-surface-300" />
                    <div className="w-3 h-3 rounded-full bg-surface-300" />
                    <div className="w-3 h-3 rounded-full bg-surface-300" />
                  </div>
                  <div className="text-xs font-mono text-surface-400">PR Review: Fix-auth-bug</div>
                </div>
                <div className="p-6 font-mono text-sm leading-relaxed text-surface-700">
                  <div className="flex gap-4"><span className="text-surface-300 select-none">1</span><span className="text-brand-600">export function</span> <span className="text-indigo-600">verifyToken</span>(token) {'{'}</div>
                  <div className="flex gap-4 bg-red-50 text-red-900"><span className="text-red-300 select-none">-</span><span>  // TODO: Add expiration check</span></div>
                  <div className="flex gap-4 bg-emerald-50 text-emerald-900"><span className="text-emerald-300 select-none">+</span><span>  if (isExpired(token)) throw new Error('Expired');</span></div>
                  <div className="flex gap-4"><span className="text-surface-300 select-none">4</span><span>  return jwt.verify(token, SECRET);</span></div>
                  <div className="flex gap-4"><span className="text-surface-300 select-none">5</span>{'}'}</div>
                  
                  <div className="mt-6 p-4 bg-brand-50 rounded-lg border border-brand-100 font-sans">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-brand-600" />
                      <span className="font-semibold text-brand-900">AI Review</span>
                    </div>
                    <p className="text-brand-800 text-sm">Great catch! Adding the expiration check prevents the replay vulnerability mentioned in issue #42. The implementation looks solid.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Features ───────────────────────────────────────────── */}
      <section id="features" className="py-32 px-6 bg-white border-y border-surface-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-serif text-surface-900 mb-6">Tools that actually understand your code.</h2>
              <p className="text-lg text-surface-600">Scroll on the carousel to control it manually. Cards move continuously in both directions.</p>
            </div>
          </div>

          {/* Row 1: Left to Right */}
          <div className="mb-12 overflow-hidden rounded-xl">
            <div 
              ref={row1TrackRef}
              className="flex gap-4 pb-4 will-change-transform"
              style={{ transform: 'translate3d(0, 0, 0)' }}
              data-carousel-row="1"
              onWheel={(e) => handleCarouselWheel(e, false)}
            >
              {[...features.slice(0, 9), ...features.slice(0, 9)].map((feature, idx) => (
                <motion.div
                  key={`row1-${feature.id}-${idx}`}
                  onClick={() => setActiveFeature(feature)}
                  className="bg-[#FCFAF8] p-6 rounded-2xl border border-surface-200 cursor-pointer hover:border-surface-300 transition-colors group flex flex-col h-full shrink-0 w-80"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </motion.div>
                  <motion.h3 className="text-lg font-bold text-surface-900 mb-2">
                    {feature.label}
                  </motion.h3>
                  <motion.p className="text-sm text-surface-500 leading-relaxed flex-1">
                    {feature.shortDesc}
                  </motion.p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Row 2: Right to Left */}
          <div className="overflow-hidden rounded-xl">
            <div 
              ref={row2TrackRef}
              className="flex gap-4 pb-4 will-change-transform"
              style={{ transform: 'translate3d(0, 0, 0)' }}
              data-carousel-row="2"
              onWheel={(e) => handleCarouselWheel(e, true)}
            >
              {[...features.slice(9, 18), ...features.slice(9, 18)].map((feature, idx) => (
                <motion.div
                  key={`row2-${feature.id}-${idx}`}
                  onClick={() => setActiveFeature(feature)}
                  className="bg-[#FCFAF8] p-6 rounded-2xl border border-surface-200 cursor-pointer hover:border-surface-300 transition-colors group flex flex-col h-full shrink-0 w-80"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </motion.div>
                  <motion.h3 className="text-lg font-bold text-surface-900 mb-2">
                    {feature.label}
                  </motion.h3>
                  <motion.p className="text-sm text-surface-500 leading-relaxed flex-1">
                    {feature.shortDesc}
                  </motion.p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <style>{`
          [data-carousel-row] {
            touch-action: none;
          }
        `}</style>
      </section>

      {/* ── Feature Modal (AnimatePresence) ──────────────────────────────── */}
      <AnimatePresence>
        {activeFeature && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveFeature(null)}
              className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4 md:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="bg-white w-full max-w-2xl rounded-3xl border border-surface-200 shadow-2xl overflow-hidden pointer-events-auto flex flex-col md:flex-row"
              >
                <div className="p-8 md:p-10 flex-1">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className={`w-16 h-16 rounded-2xl ${activeFeature.bg} flex items-center justify-center mb-8`}>
                    <activeFeature.icon className={`w-8 h-8 ${activeFeature.color}`} />
                  </motion.div>
                  <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-3xl font-serif text-surface-900 mb-4">
                    {activeFeature.label}
                  </motion.h3>
                  <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-surface-600 leading-relaxed">
                    {activeFeature.longDesc}
                  </motion.p>
                  <div className="mt-10">
                    <Link to="/login" className="inline-flex items-center gap-2 bg-surface-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-surface-800 transition-colors">
                      Try {activeFeature.label} now <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
                <div className="hidden md:block w-48 bg-[#FCFAF8] border-l border-surface-100 p-6 relative overflow-hidden">
                   {/* Decorative background element for the modal */}
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
                     <activeFeature.icon className="w-48 h-48" />
                   </div>
                </div>
                <button
                  onClick={() => setActiveFeature(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-surface-100 hover:bg-surface-200 text-surface-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ── Philosophy / Tech Stack ───────────────────────────────────────── */}
      <section id="tech-stack" className="py-32 px-6 border-b border-surface-200">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-16 md:gap-24">
          <div className="md:w-1/3">
            <h2 className="text-3xl md:text-4xl font-serif text-surface-900 mb-6">Crafted with an open, modern stack.</h2>
            <p className="text-lg text-surface-600 leading-relaxed">
              RepoNexus augments engineering teams by automating repetitive analysis while keeping decisions and context firmly under your control. Built transparently on familiar tools, it integrates directly with your existing workflows and codebase.
            </p>
          </div>

          <div className="md:w-2/3 flex flex-col">
            {stack.map(({ icon: Icon, name, role }) => (
              <div key={name} className="group flex items-center justify-between py-6 border-b border-surface-200 last:border-0 hover:px-6 hover:bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-2xl -mx-6 px-6 cursor-default">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full bg-[#FCFAF8] border border-surface-200 flex items-center justify-center shrink-0 group-hover:bg-surface-900 group-hover:border-surface-900 transition-colors duration-300">
                    <Icon className="w-5 h-5 text-surface-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="text-xl font-serif text-surface-900">{name}</div>
                </div>
                <div className="text-sm font-sans tracking-wide text-surface-500 uppercase">{role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-surface-900 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif text-white mb-6">Ready to clear your debt?</h2>
          <p className="text-lg text-surface-400 mb-10 font-sans">Join developers who are shipping faster and cleaner code. Free forever. No credit card required.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-3 bg-white text-surface-900 font-semibold px-8 py-4 rounded-xl hover:bg-surface-50 transition-transform transform hover:-translate-y-1 shadow-lg text-base"
          >
            <Github className="w-5 h-5" />
            Sign in with GitHub
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-surface-200 py-12 px-6 bg-[#FCFAF8]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-surface-900 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="RepoNexus" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-lg font-serif italic text-surface-900">RepoNexus</span>
          </div>
          <p className="text-sm text-surface-500">Built with FastAPI, React, Groq, and a lot of coffee.</p>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors">Log in</Link>
            <button onClick={() => setIsAboutOpen(true)} className="text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors">About</button>
          </div>
        </div>
      </footer>

      {/* ── Interactive About Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {isAboutOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-surface-950 flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 md:p-10 sticky top-0 bg-surface-950/80 backdrop-blur-md z-10 border-b border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center overflow-hidden">
                  <img src="/logo.png" alt="RepoNexus" className="w-10 h-10 object-contain" />
                </div>
                <span className="font-serif italic text-2xl text-white tracking-tight">RepoNexus</span>
              </div>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="p-3 rounded-full bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-24 flex flex-col lg:flex-row gap-16 lg:gap-24">
              <div className="lg:w-1/2">
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl md:text-7xl font-serif text-white leading-tight mb-8"
                >
                  Why we built<br/><span className="text-surface-400 italic">RepoNexus.</span>
                </motion.h2>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-6 text-lg md:text-xl text-surface-300 leading-relaxed font-sans"
                >
                  <p>
                    RepoNexus was born from a simple realization: engineers spend more time managing technical debt than actually building new features.
                  </p>
                  <p>
                    Codebases naturally decay over time. Tight deadlines force quick hacks, dependencies become outdated, and complex systems lose their original context when the original authors leave the team.
                  </p>
                  <p className="text-white font-medium border-l-2 border-brand-500 pl-6 my-8">
                    "We believe technical debt shouldn't be a black box that engineers fear. It should be visible, quantifiable, and easily resolvable."
                  </p>
                  <p>
                    Instead of just giving you a dashboard of hundreds of issues, we built a proactive AI intelligence layer that sits on top of your GitHub repositories, helping you understand and eliminate debt automatically.
                  </p>
                </motion.div>
              </div>

              <div className="lg:w-1/2 flex flex-col justify-center gap-6">
                {[
                  {
                    title: "For the Maintainer",
                    desc: "Automate the heavy lifting of repo management. Features like Issue Triage, Security Audits, and Architecture Diagrams keep your project organized without the manual overhead.",
                    icon: ShieldAlert,
                    color: "text-red-400",
                    bg: "bg-red-400/10 border-red-400/20"
                  },
                  {
                    title: "For the Contributor",
                    desc: "Ship code faster and safer. Use the PR Reviewer for instant feedback, auto-generate CI/CD Pipelines, or let RepoNexus generate an Auto-Fix PR for a complex bug.",
                    icon: GitPullRequest,
                    color: "text-emerald-400",
                    bg: "bg-emerald-400/10 border-emerald-400/20"
                  },
                  {
                    title: "For the New Hire",
                    desc: "Skip the painful onboarding. Generate foolproof Local Setup Guides, comprehensive READMEs, and API Docs instantly so new devs can push their first commit on day one.",
                    icon: Users,
                    color: "text-blue-400",
                    bg: "bg-blue-400/10 border-blue-400/20"
                  },
                  {
                    title: "For the Student",
                    desc: "Learn from real-world code. The interactive Code Tutor explains Big-O complexity, while the Interview Prep tool generates mock questions based on your actual repo.",
                    icon: BookOpen,
                    color: "text-amber-400",
                    bg: "bg-amber-400/10 border-amber-400/20"
                  }
                ].map((pillar, idx) => (
                  <motion.div
                    key={pillar.title}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (idx * 0.1) }}
                    whileHover={{ scale: 1.02, x: 10 }}
                    className="group p-8 rounded-3xl bg-surface-900 border border-surface-800 hover:border-surface-700 transition-all cursor-default"
                  >
                    <div className="flex items-start gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${pillar.bg} group-hover:scale-110 transition-transform`}>
                        <pillar.icon className={`w-7 h-7 ${pillar.color}`} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-serif text-white mb-2">{pillar.title}</h3>
                        <p className="text-surface-400 leading-relaxed">{pillar.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
