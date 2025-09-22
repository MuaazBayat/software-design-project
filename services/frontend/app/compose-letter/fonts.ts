// Centralized font imports using next/font to minimize layout shift (display: swap)
import { Inter, Lora, EB_Garamond, Patrick_Hand, Special_Elite, Caveat, Roboto_Mono, Merriweather, Open_Sans, Source_Sans_3, Kalam, Dancing_Script, Satisfy, Noto_Sans, Noto_Serif, Courier_Prime } from 'next/font/google'

export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
export const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' })
export const ebGaramond = EB_Garamond({ subsets: ['latin'], variable: '--font-ebgaramond', display: 'swap' })
export const patrickHand = Patrick_Hand({ subsets: ['latin'], weight: '400', variable: '--font-patrick-hand', display: 'swap' })
export const specialElite = Special_Elite({ subsets: ['latin'], weight: '400', variable: '--font-special-elite', display: 'swap' })
export const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' })
export const robotoMono = Roboto_Mono({ subsets: ['latin'], variable: '--font-roboto-mono', display: 'swap' })
export const merriweather = Merriweather({ subsets: ['latin'], weight: ['300','400','700'], variable: '--font-merriweather', display: 'swap' })
export const openSans = Open_Sans({ subsets: ['latin'], weight: ['300','400','600','700'], variable: '--font-open-sans', display: 'swap' })
export const sourceSans3 = Source_Sans_3({ subsets: ['latin'], weight: ['300','400','600','700'], variable: '--font-source-sans3', display: 'swap' })
export const kalam = Kalam({ subsets: ['latin'], weight: '400', variable: '--font-kalam', display: 'swap' })
export const dancingScript = Dancing_Script({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-dancing-script', display: 'swap' })
export const satisfy = Satisfy({ subsets: ['latin'], weight: '400', variable: '--font-satisfy', display: 'swap' })
export const notoSans = Noto_Sans({ subsets: ['latin'], weight: ['400','500','700'], variable: '--font-noto-sans', display: 'swap' })
export const notoSerif = Noto_Serif({ subsets: ['latin'], weight: ['400','600','700'], variable: '--font-noto-serif', display: 'swap' })
export const courierPrime = Courier_Prime({ subsets: ['latin'], weight: ['400','700'], variable: '--font-courier-prime', display: 'swap' })

// Friendly preset mapping consumed by the editor. Each entry may include
// optional recommended line-height & letter-spacing tweaks for visual balance.
export interface FontPresetMeta {
  id: string
  label: string
  className: string
  letterSpacing?: string
  lineHeight?: string
  category: 'sans' | 'serif' | 'mono' | 'handwritten' | 'display'
}

export const FONT_PRESETS: FontPresetMeta[] = [
  { id: 'modern', label: 'Modern (Inter)', className: inter.className, lineHeight: '1.55', category: 'sans' },
  { id: 'open-sans', label: 'Open Sans', className: openSans.className, lineHeight: '1.55', category: 'sans' },
  { id: 'source-sans', label: 'Source Sans 3', className: sourceSans3.className, lineHeight: '1.55', category: 'sans' },
  { id: 'noto-sans', label: 'Noto Sans', className: notoSans.className, lineHeight: '1.55', category: 'sans' },
  { id: 'classic', label: 'Classic (Lora)', className: lora.className, lineHeight: '1.6', category: 'serif' },
  { id: 'formal', label: 'Formal (EB Garamond)', className: ebGaramond.className, lineHeight: '1.55', category: 'serif' },
  { id: 'merriweather', label: 'Merriweather', className: merriweather.className, lineHeight: '1.6', category: 'serif' },
  { id: 'noto-serif', label: 'Noto Serif', className: notoSerif.className, lineHeight: '1.6', category: 'serif' },
  { id: 'handwritten', label: 'Handwritten (Patrick Hand)', className: patrickHand.className, lineHeight: '1.4', letterSpacing: '0.4px', category: 'handwritten' },
  { id: 'kalam', label: 'Kalam', className: kalam.className, lineHeight: '1.4', letterSpacing: '0.35px', category: 'handwritten' },
  { id: 'dancing', label: 'Dancing Script', className: dancingScript.className, lineHeight: '1.35', letterSpacing: '0.3px', category: 'handwritten' },
  { id: 'satisfy', label: 'Satisfy', className: satisfy.className, lineHeight: '1.35', letterSpacing: '0.35px', category: 'handwritten' },
  { id: 'casual-script', label: 'Casual Script (Caveat)', className: caveat.className, lineHeight: '1.35', letterSpacing: '0.3px', category: 'handwritten' },
  { id: 'typewriter', label: 'Typewriter (Special Elite)', className: specialElite.className, lineHeight: '1.5', letterSpacing: '0.25px', category: 'mono' },
  { id: 'courier-prime', label: 'Courier Prime', className: courierPrime.className, lineHeight: '1.5', category: 'mono' },
  { id: 'mono', label: 'Mono (Roboto Mono)', className: robotoMono.className, lineHeight: '1.55', category: 'mono' },
]

export const DEFAULT_FONT_ID = 'modern'
