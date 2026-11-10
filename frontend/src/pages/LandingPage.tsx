import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Github, Plus } from 'lucide-react'
import { EASE, LineRise, Marquee, Reveal, ScrollStatement, Signoff, WipeImage } from '@/components/landing/motion'
import { faqs, featured, pillars, process, stack, tools } from '@/components/landing/content'

const NAV = [
  { href: '#tools', label: 'Tools' },
  { href: '#how', label: 'How it works' },
  { href: '#stack', label: 'Stack' },
  { href: '#faq', label: 'FAQ' },
]

const pad = (n: number) => String(n).padStart(2, '0')

/** Two-line section title: uppercase grotesk first line, italic serif second line. */
function SectionTitle({ top, bottom, light = false }: { top: string; bottom: string; light?: boolean }) {
  return (
    <h2 className="font-display leading-[0.95] tracking-[-0.05em]">
      <span className={`block text-[clamp(40px,6vw,88px)] font-extrabold uppercase ${light ? 'text-nx-paper' : 'text-nx-ink'}`}>
        {top}
      </span>
      <span className={`block font-fraunces italic font-light text-[clamp(40px,6vw,88px)] ${light ? 'text-nx-acid' : 'text-nx-muted'}`}>
        {bottom}
      </span>
    </h2>
  )
}

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <p className={`font-display text-[11px] font-semibold uppercase tracking-[0.22em] ${light ? 'text-nx-line' : 'text-nx-muted'}`}>
      {children}
    </p>
  )
}

function Masthead() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-nx-line/70 bg-nx-paper/95 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 md:px-14">
        <Link to="/" className="font-display text-[28px] font-extrabold leading-none tracking-[-0.07em] text-nx-ink">
          RepoNexus<span className="text-nx-olive">.</span>
        </Link>

        <nav className="hidden items-center gap-8 text-[13px] font-medium text-nx-ink md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="group relative py-3 text-nx-ink">
              {item.label}
              <span className="absolute inset-x-0 bottom-2 h-px origin-left scale-x-0 bg-nx-ink transition-transform duration-500 ease-nx group-hover:scale-x-100" />
            </a>
          ))}
          <Link
            to="/login"
            className="ml-2 flex items-center gap-5 rounded-[4px] bg-nx-ink px-4 py-[11px] text-white transition-colors duration-300 hover:bg-nx-acid hover:text-nx-ink"
          >
            Connect GitHub <ArrowUpRight className="h-4 w-4" />
          </Link>
        </nav>

        <button
          className="flex items-center gap-2 font-display text-sm font-semibold text-nx-ink md:hidden"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          Menu <Plus className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-50 flex flex-col bg-nx-ink px-5 pb-10 pt-6 text-nx-paper md:hidden"
            initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
            exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-[28px] font-extrabold tracking-[-0.07em]">
                RepoNexus<span className="text-nx-acid">.</span>
              </span>
              <button onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm font-semibold">
                Close <Plus className="h-4 w-4 rotate-45" />
              </button>
            </div>
            <nav className="mt-16 flex flex-col gap-2">
              {NAV.map((item, i) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="font-display text-5xl font-extrabold tracking-[-0.05em] text-nx-paper"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.15 + i * 0.07 }}
                >
                  {item.label}
                </motion.a>
              ))}
            </nav>
            <Link
              to="/login"
              className="mt-auto flex items-center justify-between rounded-[4px] bg-nx-acid px-5 py-4 font-semibold text-nx-ink"
            >
              Connect GitHub <ArrowUpRight className="h-5 w-5" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function Hero() {
  return (
    <section className="bg-nx-acid text-nx-ink" aria-labelledby="hero-title">
      <div className="mx-auto max-w-[1440px] px-5 pb-12 pt-10 md:px-14 md:pb-16 md:pt-14">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease: EASE }}>
          <Eyebrow>AI repository intelligence · 18 tools · runs on your machine</Eyebrow>
        </motion.div>

        <h1
          id="hero-title"
          className="mt-6 font-display text-[clamp(56px,12.5vw,200px)] font-black uppercase leading-[0.86] tracking-[-0.065em]"
        >
          <LineRise words={['Code', 'better.']} delay={0.1} />
          <LineRise
            words={[<span key="s" className="font-fraunces font-light normal-case italic tracking-[-0.04em]">sleep easier.</span>]}
            delay={0.34}
          />
        </h1>

        <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-end">
          <Reveal delay={0.5} className="max-w-[640px]">
            <p className="text-lg leading-relaxed text-nx-ink/80 md:text-xl">
              RepoNexus was built because technical debt shouldn&apos;t be a black box. It&apos;s a suite of 18
              intelligent tools that read your repo like a human engineer would.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/login"
                className="group flex items-center gap-3 rounded-[4px] bg-nx-ink px-6 py-4 text-[15px] font-semibold text-white transition-colors duration-300 hover:bg-white hover:text-nx-ink"
              >
                <Github className="h-5 w-5" />
                Connect GitHub
                <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-nx group-hover:translate-x-1" />
              </Link>
              <a href="#tools" className="group flex items-center gap-2 px-2 py-4 text-[15px] font-semibold text-nx-ink">
                <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 ease-nx group-hover:bg-[length:100%_1px]">
                  Explore the tools
                </span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.65}>
            <figure className="border-t border-nx-ink/30 pt-5">
              <blockquote className="font-fraunces text-xl italic leading-snug">
                &ldquo;Technical debt should be visible, quantifiable, and easily resolvable.&rdquo;
              </blockquote>
              <figcaption className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-nx-ink/60">
                The RepoNexus principle
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Showcase() {
  return (
    <section className="bg-nx-paper">
      <div className="mx-auto max-w-[1440px] px-5 pt-12 md:px-14 md:pt-16">
        <WipeImage
          src="/landing/dashboard.svg"
          alt="RepoNexus dashboard showing a repository debt score, trend chart and category breakdown"
          className="aspect-[5/3] rounded-[10px] shadow-[0_40px_80px_-40px_rgba(24,26,23,0.45)]"
        />
      </div>
    </section>
  )
}

function Featured() {
  return (
    <section id="tools" className="bg-nx-paper py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-14">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <SectionTitle top="Selected" bottom="tools." />
          </Reveal>
          <Reveal delay={0.09} className="max-w-sm">
            <p className="text-lg leading-relaxed text-nx-muted">Tools that actually understand your code — a few favourites from the full toolkit below.</p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-x-8 gap-y-16 md:grid-cols-[1.07fr_1fr]">
          {featured.map((item, i) => (
            <article key={item.tool} className={i % 2 === 1 ? 'md:pt-[100px]' : ''}>
              <WipeImage src={item.image} alt={`${item.tool} illustration`} className="aspect-[5/6] rounded-[6px]" />
              <Reveal className="mt-6 flex items-start gap-5">
                <span className="font-mono text-sm text-nx-muted">{pad(i + 1)}</span>
                <div>
                  <h3 className="font-display text-[26px] font-bold tracking-[-0.04em] text-nx-ink">{item.tool}</h3>
                  <p className="mt-1 text-nx-muted">{item.caption}</p>
                </div>
              </Reveal>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Statement() {
  return (
    <section className="border-y border-nx-line bg-nx-sand py-28 md:py-40">
      <div className="mx-auto max-w-[1440px] px-5 md:px-14">
        <Eyebrow>Why RepoNexus</Eyebrow>
        <ScrollStatement
          className="mt-8 max-w-[1180px] font-display text-[clamp(32px,4.5vw,68px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-nx-ink"
          text="Engineers spend more time managing technical debt than building features. Deadlines force quick hacks, dependencies drift, and context leaves with the people who wrote the code. RepoNexus is the intelligence layer that makes that debt visible — and then helps you pay it down."
        />
      </div>
    </section>
  )
}

function Toolkit() {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <section className="bg-nx-paper py-24 md:py-36" aria-labelledby="toolkit-title">
      <div className="mx-auto max-w-[1440px] px-5 md:px-14">
        <div id="toolkit-title">
          <Reveal>
            <SectionTitle top="The full" bottom="toolkit." />
          </Reveal>
        </div>

        <ul className="mt-16 border-t border-nx-ink">
          {tools.map((tool, i) => {
            const open = openId === tool.id
            return (
              <li key={tool.id} className="border-b border-nx-line">
                <button
                  className="group grid w-full grid-cols-[40px_1fr_auto] items-baseline gap-4 py-6 text-left md:grid-cols-[64px_minmax(0,1.1fr)_minmax(0,1fr)_auto] md:gap-8"
                  onClick={() => setOpenId(open ? null : tool.id)}
                  aria-expanded={open}
                >
                  <span className="font-mono text-sm text-nx-muted">{pad(i + 1)}</span>
                  <span className="font-display text-[clamp(22px,2.6vw,36px)] font-bold leading-tight tracking-[-0.04em] text-nx-ink transition-transform duration-500 ease-nx group-hover:translate-x-2">
                    {tool.label}
                  </span>
                  <span className="hidden text-nx-muted md:block">{tool.shortDesc}</span>
                  <Plus
                    className={`h-6 w-6 text-nx-ink transition-transform duration-500 ease-nx-spring ${open ? 'rotate-45' : ''}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-3xl pb-8 pl-[56px] text-lg leading-relaxed text-nx-ink/80 md:pl-[96px]">
                        <span className="mb-2 block text-nx-muted md:hidden">{tool.shortDesc}</span>
                        {tool.longDesc}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function Marquees() {
  return (
    <section aria-hidden className="bg-nx-ink py-6 font-display text-[clamp(28px,4vw,56px)] font-extrabold tracking-[-0.04em] text-nx-paper">
      <Marquee items={tools.map((t) => t.label)} />
    </section>
  )
}

function Audience() {
  return (
    <section className="bg-nx-ink py-24 text-nx-paper md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-14">
        <Reveal>
          <SectionTitle top="Built for" bottom="everyone who ships." light />
        </Reveal>
        <div className="mt-16 grid gap-px overflow-hidden rounded-[6px] bg-white/10 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} delay={Math.min(i, 5) * 0.09} className="h-full">
              <div className="group flex h-full flex-col bg-nx-ink p-8 transition-colors duration-500 hover:bg-[#22251f]">
                <span className="font-mono text-sm text-nx-acid">{pad(i + 1)}</span>
                <h3 className="mt-10 font-display text-2xl font-bold tracking-[-0.04em]">{pillar.title}</h3>
                <p className="mt-4 leading-relaxed text-nx-line">{pillar.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how" className="bg-nx-paper py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-14">
        <Reveal>
          <SectionTitle top="How it" bottom="works." />
        </Reveal>
        <ol className="mt-16 grid gap-10 md:grid-cols-4 md:gap-8">
          {process.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.09}>
              <li className="border-t-2 border-nx-ink pt-6">
                <span className="font-display text-[64px] font-black leading-none tracking-[-0.06em] text-nx-olive">{pad(i + 1)}</span>
                <h3 className="mt-6 font-display text-2xl font-bold tracking-[-0.04em] text-nx-ink">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-nx-muted">{step.desc}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Stack() {
  return (
    <section id="stack" className="border-t border-nx-line bg-nx-paper py-24 md:py-32">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:px-14">
        <Reveal>
          <SectionTitle top="Crafted with" bottom="an open stack." />
        </Reveal>
        <ul className="grid grid-cols-2 border-l border-t border-nx-line">
          {stack.map((item, i) => (
            <li key={item.name} className="border-b border-r border-nx-line">
              <Reveal delay={(i % 2) * 0.09} className="p-6">
                <p className="font-display text-xl font-bold tracking-[-0.03em] text-nx-ink">{item.name}</p>
                <p className="mt-1 text-sm text-nx-muted">{item.role}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Quote() {
  return (
    <section className="bg-nx-sand py-24 md:py-36">
      <div className="mx-auto max-w-[1200px] px-5 md:px-14">
        <Reveal>
          <blockquote className="font-fraunces text-[clamp(30px,4vw,56px)] font-light italic leading-[1.15] tracking-[-0.02em] text-nx-ink">
            &ldquo;We believe technical debt shouldn&apos;t be a black box that engineers fear. It should be visible,
            quantifiable, and easily resolvable.&rdquo;
          </blockquote>
        </Reveal>
        <Reveal delay={0.09}>
          <p className="mt-10 max-w-2xl leading-relaxed text-nx-muted">
            Instead of just giving you a dashboard of hundreds of issues, RepoNexus is a proactive AI intelligence layer that
            sits on top of your GitHub repositories, helping you understand and eliminate debt automatically.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="bg-nx-paper py-24 md:py-36">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:px-14">
        <Reveal>
          <SectionTitle top="Good" bottom="questions." />
        </Reveal>
        <ul className="border-t border-nx-ink">
          {faqs.map((item, i) => (
            <li key={item.q} className="border-b border-nx-line">
              <button
                className="flex w-full items-center justify-between gap-6 py-6 text-left font-display text-xl font-bold tracking-[-0.03em] text-nx-ink"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                {item.q}
                <Plus className={`h-5 w-5 shrink-0 transition-transform duration-500 ease-nx-spring ${open === i ? 'rotate-45' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="overflow-hidden pb-6 leading-relaxed text-nx-muted"
                  >
                    {item.a}
                  </motion.p>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function CallToAction() {
  return (
    <section className="bg-nx-acid">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-5 py-24 md:flex-row md:items-end md:justify-between md:px-14 md:py-32">
        <Reveal>
          <h2 className="font-display text-[clamp(44px,7vw,112px)] font-black uppercase leading-[0.9] tracking-[-0.06em] text-nx-ink">
            Ready to clear
            <br />
            <span className="font-fraunces font-light normal-case italic tracking-[-0.03em]">your debt?</span>
          </h2>
        </Reveal>
        <Reveal delay={0.09} className="max-w-sm">
          <p className="text-lg leading-relaxed text-nx-ink/80">
            Join developers who are shipping faster and cleaner code. Open source, self-hosted, no credit card required.
          </p>
          <Link
            to="/login"
            className="group mt-8 inline-flex items-center gap-3 rounded-[4px] bg-nx-ink px-6 py-4 font-semibold text-white transition-colors duration-300 hover:bg-white hover:text-nx-ink"
          >
            <Github className="h-5 w-5" /> Get started
            <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-nx group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

function Footer() {
  const columns = [
    { title: 'Product', links: NAV.map((n) => ({ label: n.label, href: n.href })) },
    {
      title: 'App',
      links: [
        { label: 'Sign in', href: '/login' },
        { label: 'Dashboard', href: '/app' },
      ],
    },
    {
      title: 'Developers',
      links: [
        { label: 'API reference', href: 'http://localhost:8000/docs' },
        { label: 'Source code', href: 'https://github.com/kritikGianta/RepoNexus' },
      ],
    },
  ]
  return (
    <footer className="overflow-hidden bg-nx-paper pt-20 text-nx-ink">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] md:px-14">
        <div>
          <p className="font-display text-2xl font-bold tracking-[-0.04em]">Repository intelligence, on your machine.</p>
          <p className="mt-3 text-sm text-nx-muted">Built with FastAPI, React, Groq, and a lot of coffee.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-nx-muted">{col.title}</p>
            <ul className="mt-4 space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[15px] font-medium text-nx-ink transition-colors hover:text-nx-olive"
                    {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Signoff
        word="RepoNexus"
        className="mt-16 px-3 font-display text-[clamp(64px,17vw,300px)] font-black leading-[0.89] tracking-[-0.075em] md:px-10"
      />

      <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-2 border-t border-nx-line px-5 py-6 text-xs text-nx-muted md:flex-row md:px-14">
        <span>© {new Date().getFullYear()} RepoNexus</span>
        <span>Self-hosted · Open source</span>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-nx-paper font-display text-nx-ink antialiased selection:bg-nx-acid selection:text-nx-ink">
        <a
          href="#main"
          className="absolute -top-24 left-4 z-50 rounded bg-nx-ink px-4 py-3 text-white focus:top-2"
        >
          Skip to content
        </a>
        <Masthead />
        <main id="main">
          <Hero />
          <Showcase />
          <Featured />
          <Statement />
          <Marquees />
          <Toolkit />
          <Audience />
          <HowItWorks />
          <Stack />
          <Quote />
          <Faq />
          <CallToAction />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
