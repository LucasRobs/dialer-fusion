"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabaseClient"

interface Assistant {
  id: string
  name: string
  system_prompt: string
  first_message: string
  model: string
  voice?: string
  voice_id?: string
  status: string
  user_id: string
  published: boolean
  assistant_id: string
  created_at: string
  updated_at: string
}

export function useAssistants(userId: string) {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAssistants = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from("assistants")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })

        if (error) throw error

        setAssistants(data || [])
      } catch (err: any) {
        console.error("Erro ao buscar assistentes:", err)
        setError(err.message || "Falha ao carregar assistentes")
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchAssistants()
    }
  }, [userId])

  const createAssistant = async (assistantData: Omit<Assistant, "id" | "created_at" | "updated_at">) => {
    try {
      const newAssistant = {
        ...assistantData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("assistants").insert([newAssistant]).select()

      if (error) throw error

      setAssistants((prev) => [...(data || []), ...prev])
      return { success: true, data: data?.[0] }
    } catch (err: any) {
      console.error("Erro ao criar assistente:", err)
      return { success: false, error: err.message }
    }
  }

  const updateAssistant = async (id: string, updates: Partial<Assistant>) => {
    try {
      const { data, error } = await supabase
        .from("assistants")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()

      if (error) throw error

      setAssistants((prev) => prev.map((assistant) => (assistant.id === id ? { ...assistant, ...updates } : assistant)))

      return { success: true, data: data?.[0] }
    } catch (err: any) {
      console.error("Erro ao atualizar assistente:", err)
      return { success: false, error: err.message }
    }
  }

  const deleteAssistant = async (id: string) => {
    try {
      const { error } = await supabase.from("assistants").delete().eq("id", id)

      if (error) throw error

      setAssistants((prev) => prev.filter((assistant) => assistant.id !== id))
      return { success: true }
    } catch (err: any) {
      console.error("Erro ao excluir assistente:", err)
      return { success: false, error: err.message }
    }
  }

  const togglePublished = async (id: string, published: boolean) => {
    return updateAssistant(id, { published })
  }

  return {
    assistants,
    loading,
    error,
    createAssistant,
    updateAssistant,
    deleteAssistant,
    togglePublished,
  }
}
