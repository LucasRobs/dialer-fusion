"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Edit, Trash2, Eye, EyeOff } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface AssistantCardProps {
  assistant: any
  onDelete?: () => void
  onUpdate?: () => void
}

export function AssistantCard({ assistant, onDelete, onUpdate }: AssistantCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleTogglePublished = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from("assistants")
        .update({
          published: !assistant.published,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assistant.id)

      if (error) throw error

      toast({
        title: assistant.published ? "Assistente despublicado" : "Assistente publicado",
        description: assistant.published
          ? "O assistente não está mais disponível publicamente."
          : "O assistente agora está disponível publicamente.",
      })

      if (onUpdate) onUpdate()
      router.refresh()
    } catch (err: any) {
      console.error("Erro ao alterar status do assistente:", err)
      toast({
        variant: "destructive",
        title: "Erro",
        description: err.message || "Falha ao alterar status do assistente.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.from("assistants").delete().eq("id", assistant.id)

      if (error) throw error

      toast({
        title: "Assistente excluído",
        description: "O assistente foi excluído com sucesso.",
      })

      setDeleteDialogOpen(false)
      if (onDelete) onDelete()
      router.refresh()
    } catch (err: any) {
      console.error("Erro ao excluir assistente:", err)
      toast({
        variant: "destructive",
        title: "Erro",
        description: err.message || "Falha ao excluir assistente.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
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
        <div className="text-xs text-gray-500">Criado em: {new Date(assistant.created_at).toLocaleDateString()}</div>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleTogglePublished}
            disabled={loading}
            title={assistant.published ? "Despublicar" : "Publicar"}
          >
            {assistant.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/assistants/${assistant.id}/edit`)}
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Excluir">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Excluir Assistente</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir o assistente "{assistant.name}"? Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                  {loading ? "Excluindo..." : "Excluir"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardFooter>
    </Card>
  )
}
