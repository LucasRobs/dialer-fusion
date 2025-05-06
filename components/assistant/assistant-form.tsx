"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface AssistantFormProps {
  userId: string
  assistant?: any
  onSuccess?: () => void
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

export function AssistantForm({ userId, assistant, onSuccess }: AssistantFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: assistant?.name || "",
    system_prompt: assistant?.system_prompt || "",
    first_message: assistant?.first_message || "Olá! Como posso ajudar você hoje?",
    model: assistant?.model || "gpt-4o",
    voice: assistant?.voice || "nova",
    voice_id: assistant?.voice_id || "nova",
    status: assistant?.status || "active",
    published: assistant?.published || false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Se estiver alterando a voz, atualizar também o voice_id
    if (name === "voice") {
      setFormData((prev) => ({ ...prev, voice_id: value }))
    }
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, published: checked }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("O nome do assistente é obrigatório")
      return false
    }
    if (!formData.system_prompt.trim()) {
      setError("O prompt do sistema é obrigatório")
      return false
    }
    if (!formData.first_message.trim()) {
      setError("A primeira mensagem é obrigatória")
      return false
    }
    setError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setLoading(true)

      const assistantData = {
        ...formData,
        user_id: userId,
        updated_at: new Date().toISOString(),
      }

      if (assistant) {
        // Atualizar assistente existente
        const { error } = await supabase.from("assistants").update(assistantData).eq("id", assistant.id)

        if (error) throw error

        toast({
          title: "Sucesso!",
          description: "Assistente atualizado com sucesso.",
        })
      } else {
        // Criar novo assistente
        const assistantId = crypto.randomUUID()
        const newAssistant = {
          ...assistantData,
          assistant_id: assistantId,
          created_at: new Date().toISOString(),
        }

        const { error } = await supabase.from("assistants").insert([newAssistant])

        if (error) throw error

        toast({
          title: "Sucesso!",
          description: "Assistente criado com sucesso.",
        })

        // Limpar o formulário após sucesso
        setFormData({
          name: "",
          system_prompt: "",
          first_message: "Olá! Como posso ajudar você hoje?",
          model: "gpt-4o",
          voice: "nova",
          voice_id: "nova",
          status: "active",
          published: false,
        })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/assistants")
        router.refresh()
      }
    } catch (err: any) {
      console.error("Erro ao salvar assistente:", err)
      setError(err.message || "Ocorreu um erro ao salvar o assistente. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name" className="block text-sm font-medium mb-1">
            Nome do Assistente
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ex: Assistente de Vendas"
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="system_prompt" className="block text-sm font-medium mb-1">
            Prompt do Sistema
          </Label>
          <Textarea
            id="system_prompt"
            name="system_prompt"
            value={formData.system_prompt}
            onChange={handleChange}
            placeholder="Instruções para o comportamento do assistente..."
            rows={4}
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="first_message" className="block text-sm font-medium mb-1">
            Primeira Mensagem
          </Label>
          <Textarea
            id="first_message"
            name="first_message"
            value={formData.first_message}
            onChange={handleChange}
            placeholder="Mensagem inicial do assistente..."
            rows={2}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="model" className="block text-sm font-medium mb-1">
              Modelo
            </Label>
            <Select
              value={formData.model}
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
            <Label htmlFor="voice" className="block text-sm font-medium mb-1">
              Voz
            </Label>
            <Select
              value={formData.voice}
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
          <Switch id="published" checked={formData.published} onCheckedChange={handleSwitchChange} disabled={loading} />
          <Label htmlFor="published">Publicar assistente</Label>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : assistant ? "Atualizar Assistente" : "Criar Assistente"}
        </Button>
      </form>
    </div>
  )
}
