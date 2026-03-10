"use client"

import { useEffect, useState } from "react"
import WelcomeModal from "@/components/welcome-modal"

export default function WelcomeHandler() {
  const [showWelcome, setShowWelcome] = useState(false)
  const [firstName, setFirstName] = useState("")

  useEffect(() => {
    const handleUserLoggedIn = (event: any) => {
      setFirstName(event.detail.firstName)
      setShowWelcome(true)
    }

    window.addEventListener("user-logged-in", handleUserLoggedIn)
    return () => window.removeEventListener("user-logged-in", handleUserLoggedIn)
  }, [])

  return (
    <WelcomeModal
      firstName={firstName}
      isOpen={showWelcome}
      onClose={() => setShowWelcome(false)}
    />
  )
}
