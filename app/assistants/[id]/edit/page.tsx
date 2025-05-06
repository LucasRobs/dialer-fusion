"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AssistantForm } from "@/components/assistant/assistant-form"

export default function EditAssistantPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading } = useSupabase()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [assistant, setAssistant] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [isLoading, user, router])

  useEffect(() => {
    const fetchAssistant = async () => {
      if (!user || !params.id) return

      try {
        setLoading(true)

        const { data, error } = await supabase.from("assistants").select("*").eq("id", params.id).single()

        if (error) throw error

        if (!data) {
          router.push("/assistants")
          toast({
            variant: "destructive",
            title: "Assistente não encontrado",
            description: "O assistente que você está tentando editar não existe.",
          })
          return
        }

        // Verificar se o usuário é o proprietário do assistente
        if (data.user_id !== user.id) {
          router.push("/assistants")
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

    fetchAssistant()
  }, [user, params.id, supabase, router, toast])

  const handleSuccess = () => {
    toast({
      title: "Assistente atualizado",
      description: "O assistente foi atualizado com sucesso.",
    })
    router.push("/assistants")
  }

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.push("/assistants")} className="mr-4">
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

      {loading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : assistant ? (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
          <AssistantForm userId={user.id} assistant={assistant} onSuccess={handleSuccess} />
        </div>
      ) : (
        <Alert variant="destructive">
          <AlertDescription>Assistente não encontrado ou você não tem permissão para editá-lo.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
