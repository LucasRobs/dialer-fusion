"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AssistantCard } from "@/components/assistant/assistant-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AssistantForm } from "@/components/assistant/assistant-form"

export default function AssistantsPage() {
  const router = useRouter()
  const { user, isLoading } = useSupabase()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [assistants, setAssistants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [isLoading, user, router])

  useEffect(() => {
    const fetchAssistants = async () => {
      if (!user) return

      try {
        setLoading(true)

        const { data, error } = await supabase
          .from("assistants")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) throw error

        setAssistants(data || [])
      } catch (err: any) {
        console.error("Erro ao buscar assistentes:", err)
        setError(err.message || "Falha ao carregar assistentes")
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os assistentes. Tente novamente.",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAssistants()
  }, [user, supabase, toast])

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false)
    toast({
      title: "Assistente criado",
      description: "O assistente foi criado com sucesso.",
    })
    // Recarregar a lista de assistentes
    router.refresh()
  }

  const handleUpdate = () => {
    // Recarregar a lista de assistentes
    router.refresh()
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Meus Assistentes</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Assistente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Assistente</DialogTitle>
            </DialogHeader>
            <AssistantForm userId={user.id} onSuccess={handleCreateSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      {loading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : assistants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map((assistant) => (
            <AssistantCard key={assistant.id} assistant={assistant} onUpdate={handleUpdate} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Você ainda não tem assistentes.</p>
          <Button variant="outline" className="mt-4" onClick={() => setCreateDialogOpen(true)}>
            Criar seu primeiro assistente
          </Button>
        </div>
      )}
    </div>
  )
}
