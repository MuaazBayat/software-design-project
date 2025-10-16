import { LineSpinner } from 'ldrs/react'
import 'ldrs/react/LineSpinner.css'
import { useState, useEffect } from 'react'

const funnyMessages = [
  "Connecting hearts across continents... 💕",
  "Teaching our servers how to write love letters...",
  "Translating 'Hello' into 50+ languages... 🌍",
  "Matching you with your future pen pal bestie...",
  "Folding virtual paper airplanes... ✈️",
  "Charging our friendship algorithms... ⚡",
  "Brewing some international tea for our chat... ☕",
  "Convincing shy users to send their first letter...",
  "Calibrating our global heartstring detector... 💖",
  "Loading cute cultural exchange stories... 📚",
  "Finding stamps in Narnia…",
  "Sharpening our pencils… and our wit.",
  "Waiting for the mail pigeon to return…",
  "Writing heartfelt intros in invisible ink…",
  "Perfecting your penmanship in 0s and 1s…",
  "Time-traveling to when people used envelopes.",
  "Sending vibes via snail mail… please hold.",
  "Thinking of clever ways to say 'Hi' in 12 languages…",
  "Reading your future penpal's diary (just kidding… or are we?).",
  "Matching you with someone just far enough to miss, but close enough to find."
]

export default function Loader() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        let next
        do {
          next = Math.floor(Math.random() * funnyMessages.length)
        } while (next === prev) // Avoid repeating the same message
        return next
      })
    }, 2000) // Change message every 2 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full h-full">
      <LineSpinner
        size="120"
        stroke="7"
        speed="2.5"
        color="rgb(0 0 0)"
      />
      <p className="text-black text-center max-w-sm">
        {funnyMessages[messageIndex]}
      </p>
    </div>
  )
}
