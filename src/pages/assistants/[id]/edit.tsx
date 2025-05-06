"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../../lib/supabaseClient"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Textarea } from "../../../components/ui/textarea"
import { Alert, AlertDescription } from "../../../components/ui/alert"
import { useToast } from "../../../hooks/useToast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Switch } from "../../../components/ui/switch"
import { Label } from "../../../components/ui/label"
import { Loader2, ArrowLeft } from "lucide-react"

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

export default function EditAssistantPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [assistant, setAssistant] = useState<Assistant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAssistant = async () => {
      try {
        setLoading(true)

        // Verificar autenticação
        const { data: authData } = await supabase.auth.getSession()
        if (!authData.session) {
          navigate("/login")
          return
        }

        const { data, error } = await supabase.from("assistants").select("*").eq("id", id).single()

        if (error) throw error

        if (!data) {
          navigate("/assistants")
          toast({
            variant: "destructive",
            title: "Assistente não encontrado",
            description: "O assistente que você está tentando editar não existe.",
          })
          return
        }

        // Verificar se o usuário é o proprietário do assistente
        if (data.user_id !== authData.session.user.id) {
          navigate("/assistants")
          toast({
            variant: "destructive",
            title: "Acesso negado",
            description: "Você não tem permissão para editar este assistente.",
          })
          return
        }

        setAssistant(data)
      } catch (err: any) {
        console.error("Erro ao buscar assistente:", err)
        setError(err.message || "Falha ao carregar assistente")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchAssistant()
    }
  }, [id, navigate, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (assistant) {
      setAssistant({ ...assistant, [name]: value })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    if (assistant) {
      setAssistant({ ...assistant, [name]: value })

      // Se estiver alterando a voz, atualizar também o voice_id
      if (name === "voice") {
        setAssistant({ ...assistant, [name]: value, voice_id: value })
      }
    }
  }

  const handleSwitchChange = (checked: boolean) => {
    if (assistant) {
      setAssistant({ ...assistant, published: checked })
    }
  }

  const validateForm = () => {
    if (!assistant?.name.trim()) {
      setError("O nome do assistente é obrigatório")
      return false
    }
    if (!assistant?.system_prompt.trim()) {
      setError("O prompt do sistema é obrigatório")
      return false
    }
    if (!assistant?.first_message.trim()) {
      setError("A primeira mensagem é obrigatória")
      return false
    }
    setError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !assistant) return

    try {
      setSaving(true)

      const updates = {
        ...assistant,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("assistants").update(updates).eq("id", assistant.id)

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Assistente atualizado com sucesso.",
      })

      navigate("/assistants")
    } catch (err: any) {
      console.error("Erro ao atualizar assistente:", err)
      setError(err.message || "Ocorreu um erro ao atualizar o assistente. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!assistant) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertDescription>Assistente não encontrado ou você não tem permissão para editá-lo.</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate("/assistants")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Assistentes
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/assistants")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Editar Assistente</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Nome do Assistente
            </label>
            <Input
              id="name"
              name="name"
              value={assistant.name}
              onChange={handleChange}
              placeholder="Ex: Assistente de Vendas"
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="system_prompt" className="block text-sm font-medium mb-1">
              Prompt do Sistema
            </label>
            <Textarea
              id="system_prompt"
              name="system_prompt"
              value={assistant.system_prompt}
              onChange={handleChange}
              placeholder="Instruções para o comportamento do assistente..."
              rows={4}
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="first_message" className="block text-sm font-medium mb-1">
              Primeira Mensagem
            </label>
            <Textarea
              id="first_message"
              name="first_message"
              value={assistant.first_message}
              onChange={handleChange}
              placeholder="Mensagem inicial do assistente..."
              rows={2}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="model" className="block text-sm font-medium mb-1">
                Modelo
              </label>
              <Select
                value={assistant.model}
                onValueChange={(value) => handleSelectChange("model", value)}
                disabled={saving}
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
                value={assistant.voice || ""}
                onValueChange={(value) => handleSelectChange("voice", value)}
                disabled={saving}
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
              checked={assistant.published}
              onCheckedChange={handleSwitchChange}
              disabled={saving}
            />
            <Label htmlFor="published">Publicar assistente</Label>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </div>
    </div>
  )
}
