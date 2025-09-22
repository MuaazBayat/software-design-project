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
  "Loading cute cultural exchange stories... 📚"
]

export function Loader() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % funnyMessages.length)
    }, 2000) // Change message every 2 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full h-full">
      <LineSpinner
        size="40"
        stroke="3"
        speed="1"
        color="rgb(236 72 153)" // pink-500
      />
      <p className="text-gray-600 text-center max-w-sm animate-pulse">
        {funnyMessages[messageIndex]}
      </p>
    </div>
  )
}