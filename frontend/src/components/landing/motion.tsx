import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'

/** Long, soft deceleration used for every reveal. */
export const EASE = [0.32, 0.72, 0, 1] as const
/** Slight overshoot for letters that "pop" into place. */
export const SPRING = [0.34, 1.56, 0.64, 1] as const

const VIEWPORT = { once: true, margin: '0px 0px -12% 0px' } as const

/** Blur-up reveal: rises 56px and sharpens from an 8px blur as it enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 56, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={VIEWPORT}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Image that is wiped in from the bottom while it settles from a slight zoom. */
export function WipeImage({
  src,
  alt,
  className = '',
  delay = 0,
}: {
  src: string
  alt: string
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={`overflow-hidden ${className}`}
      initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={VIEWPORT}
      transition={{ duration: 1.3, ease: EASE, delay }}
    >
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover"
        initial={{ scale: 1.18 }}
        whileInView={{ scale: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: 1.8, ease: EASE, delay }}
      />
    </motion.div>
  )
}

/** Headline line whose words rise out of a clipped baseline, staggered by 120ms. */
export function LineRise({
  words,
  delay = 0,
  className = '',
}: {
  words: ReactNode[]
  delay?: number
  className?: string
}) {
  return (
    <span className={`block overflow-hidden pt-[0.04em] pb-[0.06em] -mb-[0.06em] ${className}`}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block will-change-transform"
          initial={{ y: '105%' }}
          animate={{ y: '0%' }}
          transition={{ duration: 1.1, ease: EASE, delay: delay + i * 0.12 }}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </span>
  )
}

function ScrollWord({
  word,
  progress,
  range,
}: {
  word: string
  progress: MotionValue<number>
  range: [number, number]
}) {
  const opacity = useTransform(progress, range, [0.22, 1])
  return (
    <motion.span style={{ opacity }} className="inline">
      {word}{' '}
    </motion.span>
  )
}

/** Large statement paragraph whose words light up as it scrolls through the viewport. */
export function ScrollStatement({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = text.split(' ')
  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <ScrollWord
          key={i}
          word={word}
          progress={scrollYProgress}
          range={[i / words.length, Math.min(1, (i + 1.5) / words.length)]}
        />
      ))}
    </p>
  )
}

/** Oversized sign-off wordmark: letters spring up in sequence and lift on hover. */
export function Signoff({ word, className = '' }: { word: string; className?: string }) {
  const letters = [...word]
  return (
    <div className={`whitespace-nowrap select-none ${className}`} aria-label={`${word}.`}>
      {[...letters, '.'].map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`inline-block ${i === letters.length ? 'text-nx-olive' : ''}`}
          initial={{ y: '60%', opacity: 0 }}
          whileInView={{ y: '0%', opacity: 1 }}
          whileHover={{ y: '-12%', transition: { duration: 0.6, ease: SPRING } }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: SPRING, delay: i * 0.06 }}
        >
          {ch}
        </motion.span>
      ))}
    </div>
  )
}

/** Infinite horizontal ticker; content is duplicated so the loop is seamless. */
export function Marquee({ items, className = '' }: { items: string[]; className?: string }) {
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="px-8">{item}</span>
          <span className="text-nx-acid">✦</span>
        </span>
      ))}
    </div>
  )
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex w-max animate-marquee motion-reduce:animate-none hover:[animation-play-state:paused]">
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}
