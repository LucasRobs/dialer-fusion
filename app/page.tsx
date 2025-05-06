import { Button } from "../components/ui/button"
import Link from "next/link"

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dialer Fusion</h1>
          <nav className="space-x-4">
            <Button asChild variant="ghost">
              <Link href="/assistants">Assistentes</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/calls">Chamadas</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold">Bem-vindo ao Dialer Fusion</h2>
          <p className="text-xl text-gray-600">
            Plataforma de comunicação inteligente com assistentes de IA para suas chamadas
          </p>

          <div className="flex justify-center gap-4 mt-8">
            <Button asChild size="lg">
              <Link href="/assistants">Gerenciar Assistentes</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/calls">Ver Chamadas</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-gray-500">
          &copy; {new Date().getFullYear()} Dialer Fusion. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}
