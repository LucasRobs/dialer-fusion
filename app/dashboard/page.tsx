import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, User, Clock, ArrowUpRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Dashboard | Dialer Fusion",
  description: "Painel de controle do Dialer Fusion",
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total de Chamadas</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Phone className="mr-2 h-5 w-5 text-muted-foreground" />
                <span className="text-3xl font-bold">128</span>
              </div>
              <div className="text-sm text-green-500 flex items-center">
                +12%
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Assistentes Ativos</CardTitle>
            <CardDescription>Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="mr-2 h-5 w-5 text-muted-foreground" />
                <span className="text-3xl font-bold">5</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Tempo Médio</CardTitle>
            <CardDescription>Duração das chamadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-muted-foreground" />
                <span className="text-3xl font-bold">3:45</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chamadas Recentes</CardTitle>
            <CardDescription>Últimas 5 chamadas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">
                      (11) 9{i}234-567{i}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(Date.now() - i * 86400000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {i + 1}:3{i}
                    </p>
                    <p className="text-sm text-muted-foreground">Duração</p>
                  </div>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/calls">Ver Todas as Chamadas</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assistentes Populares</CardTitle>
            <CardDescription>Assistentes mais utilizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["Assistente de Vendas", "Suporte Técnico", "Atendimento ao Cliente", "Agendamento", "Pesquisa"].map(
                (name, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <p className="font-medium">{name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{50 - i * 8}</p>
                      <p className="text-sm text-muted-foreground">Chamadas</p>
                    </div>
                  </div>
                ),
              )}
            </div>
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/assistants">Gerenciar Assistentes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
