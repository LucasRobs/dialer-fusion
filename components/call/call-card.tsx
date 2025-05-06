"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Phone, Play, Download, Trash2 } from "lucide-react"
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
import { formatDuration, formatPhoneNumber } from "@/lib/utils"

interface CallCardProps {
  call: any
  onDelete?: () => void
}

export function CallCard({ call, onDelete }: CallCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  const handlePlayRecording = () => {
    if (!call.recording_url) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Gravação não disponível para esta chamada.",
      })
      return
    }

    if (!audio) {
      const newAudio = new Audio(call.recording_url)
      newAudio.addEventListener("ended", () => setIsPlaying(false))
      setAudio(newAudio)
      newAudio.play()
      setIsPlaying(true)
    } else {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        audio.play()
        setIsPlaying(true)
      }
    }
  }

  const handleDownloadRecording = () => {
    if (!call.recording_url) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Gravação não disponível para esta chamada.",
      })
      return
    }

    const link = document.createElement("a")
    link.href = call.recording_url
    link.download = `call-${call.id}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.from("calls").delete().eq("id", call.id)

      if (error) throw error

      toast({
        title: "Chamada excluída",
        description: "A chamada foi excluída com sucesso.",
      })

      setDeleteDialogOpen(false)
      if (onDelete) onDelete()
      router.refresh()
    } catch (err: any) {
      console.error("Erro ao excluir chamada:", err)
      toast({
        variant: "destructive",
        title: "Erro",
        description: err.message || "Falha ao excluir chamada.",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    switch (call.status) {
      case "completed":
        return <Badge variant="default">Concluída</Badge>
      case "failed":
        return <Badge variant="destructive">Falha</Badge>
      case "in-progress":
        return <Badge variant="secondary">Em andamento</Badge>
      default:
        return <Badge variant="outline">{call.status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">
            <Phone className="h-4 w-4 inline mr-2" />
            {formatPhoneNumber(call.client_phone || "Desconhecido")}
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Duração:</span> {formatDuration(call.duration || 0)}
          </div>
          <div className="text-sm">
            <span className="font-medium">Data:</span>{" "}
            {call.call_start ? new Date(call.call_start).toLocaleString() : "N/A"}
          </div>
          {call.call_summary && (
            <div className="text-sm mt-2">
              <span className="font-medium">Resumo:</span>
              <p className="mt-1 text-muted-foreground line-clamp-3">{call.call_summary}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="flex space-x-1">
          {call.recording_url && (
            <>
              <Button variant="outline" size="sm" onClick={handlePlayRecording} className="flex items-center">
                <Play className="h-4 w-4 mr-1" />
                {isPlaying ? "Pausar" : "Reproduzir"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadRecording} className="flex items-center">
                <Download className="h-4 w-4 mr-1" />
                Baixar
              </Button>
            </>
          )}
        </div>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" title="Excluir">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Chamada</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir esta chamada? Esta ação não pode ser desfeita.
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
      </CardFooter>
    </Card>
  )
}
