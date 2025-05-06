"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { useSupabase } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  const router = useRouter()
  const { user, isLoading } = useSupabase()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [isLoading, user, router])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return

      try {
        setLoading(true)

        const { data, error } = await supabase.from("accounts").select("*").eq("id", user.id).single()

        if (error) throw error

        setProfile({
          name: data.name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
        })
      } catch (err: any) {
        console.error("Erro ao buscar perfil:", err)
        setError(err.message || "Falha ao carregar perfil")
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar suas informações. Tente novamente.",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, supabase, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      setSaving(true)
      setError(null)

      const { error } = await supabase
        .from("accounts")
        .update({
          name: profile.name,
          phone: profile.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      })
    } catch (err: any) {
      console.error("Erro ao atualizar perfil:", err)
      setError(err.message || "Falha ao atualizar perfil")
    } finally {
      setSaving(false)
    }
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
      <h1 className="text-3xl font-bold mb-8">Configurações</h1>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Gerencie suas informações pessoais</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex justify-center my-6">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" value={profile.name} onChange={handleChange} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" value={profile.email} disabled={true} readOnly />
                  <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                    disabled={saving}
                  />
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>Gerencie sua senha e segurança da conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input id="current-password" type="password" disabled={true} value="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input id="new-password" type="password" disabled={true} value="" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input id="confirm-password" type="password" disabled={true} value="" />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              Alterar Senha
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
