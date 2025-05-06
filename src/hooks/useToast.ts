"use client"

import { useState } from "react"

type ToastType = "default" | "destructive" | "success"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastType
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = ({ title, description, variant = "default", duration = 5000 }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, title, description, variant, duration }

    setToasts((prevToasts) => [...prevToasts, newToast])

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id)
      }, duration)
    }

    return id
  }

  const dismissToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }

  return { toast, dismissToast, toasts }
}
