"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Alert, AlertDescription } from "../ui/alert"
import { useToast } from "../../hooks/useToast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"

interface AssistantProps {
  userId: string
  onSuccess?: () => void
}

interface AssistantData {
  id?: string
  name: string
  system_prompt: string
  first_message: string
  model: string
  voice?: string
  voice_id?: string
  status: string
  user_id: string
  published: boolean
  assistant_id?: string
}

const VOICE_OPTIONS = [
  { id: "nova", name: "Nova" },
  { id: "alloy", name: "Alloy" },
  { id: "shimmer", name: "Shimmer" },
  { id: "echo", name: "Echo" },
  { id: "fable", name: "Fable" },
  { id: "onyx", name: "Onyx" },
]

const MODEL_OPTIONS = [
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  { id: "gpt-4", name: "GPT-4" },
  { id: "gpt-4o", name: "GPT-4o" },
]

export function Assistant({ userId, onSuccess }: AssistantProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assistantData, setAssistantData] = useState<AssistantData>({
    name: "",
    system_prompt: "",
    first_message: "Olá! Como posso ajudar você hoje?",
    model: "gpt-4o",
    voice: "nova",
    voice_id: "nova",
    status: "active",
    user_id: userId,
    published: false,
  })
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setAssistantData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setAssistantData((prev) => ({ ...prev, [name]: value }))

    // Se estiver alterando a voz, atualizar também o voice_id
    if (name === "voice") {
      setAssistantData((prev) => ({ ...prev, voice_id: value }))
    }
  }

  const handleSwitchChange = (checked: boolean) => {
    setAssistantData((prev) => ({ ...prev, published: checked }))
  }

  const validateForm = () => {
    if (!assistantData.name.trim()) {
      setError("O nome do assistente é obrigatório")
      return false
    }
    if (!assistantData.system_prompt.trim()) {
      setError("O prompt do sistema é obrigatório")
      return false
    }
    if (!assistantData.first_message.trim()) {
      setError("A primeira mensagem é obrigatória")
      return false
    }
    setError(null)
    return true
  }

  const createAssistant = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setLoading(true)

      // Gerar um UUID para assistant_id
      const assistantId = crypto.randomUUID()

      const newAssistant = {
        ...assistantData,
        assistant_id: assistantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Criar o assistente
      const { data, error } = await supabase.from("assistants").insert([newAssistant]).select()

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Assistente criado com sucesso.",
      })

      // Limpar o formulário após sucesso
      setAssistantData({
        name: "",
        system_prompt: "",
        first_message: "Olá! Como posso ajudar você hoje?",
        model: "gpt-4o",
        voice: "nova",
        voice_id: "nova",
        status: "active",
        user_id: userId,
        published: false,
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error("Erro ao criar assistente:", err)
      setError(err.message || "Ocorreu um erro ao criar o assistente. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Criar Novo Assistente</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={createAssistant} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Nome do Assistente
          </label>
          <Input
            id="name"
            name="name"
            value={assistantData.name}
            onChange={handleChange}
            placeholder="Ex: Assistente de Vendas"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="system_prompt" className="block text-sm font-medium mb-1">
            Prompt do Sistema
          </label>
          <Textarea
            id="system_prompt"
            name="system_prompt"
            value={assistantData.system_prompt}
            onChange={handleChange}
            placeholder="Instruções para o comportamento do assistente..."
            rows={4}
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="first_message" className="block text-sm font-medium mb-1">
            Primeira Mensagem
          </label>
          <Textarea
            id="first_message"
            name="first_message"
            value={assistantData.first_message}
            onChange={handleChange}
            placeholder="Mensagem inicial do assistente..."
            rows={2}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="model" className="block text-sm font-medium mb-1">
              Modelo
            </label>
            <Select
              value={assistantData.model}
              onValueChange={(value) => handleSelectChange("model", value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="voice" className="block text-sm font-medium mb-1">
              Voz
            </label>
            <Select
              value={assistantData.voice}
              onValueChange={(value) => handleSelectChange("voice", value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma voz" />
              </SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="published"
            checked={assistantData.published}
            onCheckedChange={handleSwitchChange}
            disabled={loading}
          />
          <Label htmlFor="published">Publicar assistente</Label>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Criando..." : "Criar Assistente"}
        </Button>
      </form>
    </div>
  )
}
