"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, Phone } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { CallCard } from "@/components/call/call-card"

export default function CallsPage() {
  const router = useRouter()
  const { user, isLoading } = useSupabase()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [isLoading, user, router])

  useEffect(() => {
    const fetchCalls = async () => {
      if (!user) return

      try {
        setLoading(true)

        const { data, error } = await supabase.from("calls").select("*").order("created_at", { ascending: false })

        if (error) throw error

        setCalls(data || [])
      } catch (err: any) {
        console.error("Erro ao buscar chamadas:", err)
        setError(err.message || "Falha ao carregar chamadas")
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar as chamadas. Tente novamente.",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCalls()
  }, [user, supabase, toast])

  const filteredCalls = calls.filter((call) => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      (call.client_phone && call.client_phone.toLowerCase().includes(query)) ||
      (call.call_summary && call.call_summary.toLowerCase().includes(query))
    )
  })

  const handleUpdate = () => {
    // Recarregar a lista de chamadas
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Chamadas</h1>
        <div className="w-full md:w-auto flex gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar chamadas..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button>
            <Phone className="mr-2 h-4 w-4" />
            Nova Chamada
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      {loading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredCalls.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCalls.map((call) => (
            <CallCard key={call.id} call={call} onDelete={handleUpdate} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {searchQuery ? "Nenhuma chamada encontrada para sua busca." : "Você ainda não tem chamadas registradas."}
          </p>
          <Button className="mt-4">
            <Phone className="mr-2 h-4 w-4" />
            Realizar Chamada
          </Button>
        </div>
      )}
    </div>
  )
}
