"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { Assistant } from "../../components/assistant/Assistant"
import { useAssistants } from "../../hooks/useAssistants"
import { Button } from "../../components/ui/button"
import { Loader2, Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react"
import { useToast } from "../../hooks/useToast"
import { Badge } from "../../components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"

export default function AssistantsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        navigate("/login")
        return
      }

      setUserId(data.session.user.id)
    }

    checkAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/login")
      } else if (session) {
        setUserId(session.user.id)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [navigate])

  const { assistants, loading, error, deleteAssistant, togglePublished } = useAssistants(userId || "")

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este assistente?")) {
      const result = await deleteAssistant(id)

      if (result.success) {
        toast({
          title: "Assistente excluído",
          description: "O assistente foi excluído com sucesso.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.error || "Falha ao excluir assistente.",
        })
      }
    }
  }

  const handleTogglePublished = async (id: string, currentStatus: boolean) => {
    const result = await togglePublished(id, !currentStatus)

    if (result.success) {
      toast({
        title: currentStatus ? "Assistente despublicado" : "Assistente publicado",
        description: currentStatus
          ? "O assistente não está mais disponível publicamente."
          : "O assistente agora está disponível publicamente.",
      })
    } else {
      toast({
        variant: "destructive",
        title: "Erro",
        description: result.error || "Falha ao alterar status do assistente.",
      })
    }
  }

  const handleCreateSuccess = () => {
    setShowCreateForm(false)
    toast({
      title: "Assistente criado",
      description: "O assistente foi criado com sucesso.",
    })
  }

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Meus Assistentes</h1>
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
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
            {userId && <Assistant userId={userId} onSuccess={handleCreateSuccess} />}
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
            <Card key={assistant.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{assistant.name}</CardTitle>
                  <Badge variant={assistant.published ? "default" : "outline"}>
                    {assistant.published ? "Publicado" : "Rascunho"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Modelo:</span> {assistant.model}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Voz:</span> {assistant.voice || "Padrão"}
                  </div>
                  <div className="text-sm line-clamp-2">
                    <span className="font-medium">Primeira mensagem:</span> {assistant.first_message}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <div className="text-xs text-gray-500">
                  Criado em: {new Date(assistant.created_at).toLocaleDateString()}
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTogglePublished(assistant.id, assistant.published)}
                    title={assistant.published ? "Despublicar" : "Publicar"}
                  >
                    {assistant.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/assistants/${assistant.id}/edit`)}
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(assistant.id)} title="Excluir">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Você ainda não tem assistentes.</p>
          <Button variant="outline" className="mt-4" onClick={() => setShowCreateForm(true)}>
            Criar seu primeiro assistente
          </Button>
        </div>
      )}
    </div>
  )
}
