import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Phone, Bot, Settings } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dialer Fusion</h1>
          <nav className="space-x-4">
            <Button asChild variant="ghost">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/assistants">Assistentes</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Comunicação Inteligente com Assistentes de IA</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              Transforme suas chamadas telefônicas com assistentes de IA personalizados que se comunicam de forma
              natural e eficiente.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/login">
                  Começar Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/about">Saiba Mais</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <h3 className="text-3xl font-bold text-center mb-12">Principais Recursos</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Assistentes Personalizados</h4>
                <p className="text-gray-600">
                  Crie assistentes de IA com personalidade e conhecimento específicos para suas necessidades.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Chamadas Inteligentes</h4>
                <p className="text-gray-600">
                  Realize chamadas com assistentes de IA que podem entender contexto e responder naturalmente.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Análise Avançada</h4>
                <p className="text-gray-600">
                  Obtenha insights detalhados sobre suas chamadas e melhore sua comunicação.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold">Dialer Fusion</h3>
              <p className="text-gray-600">Comunicação inteligente com IA</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
              <Link href="/about" className="text-gray-600 hover:text-blue-600">
                Sobre
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-blue-600">
                Privacidade
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-blue-600">
                Termos
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-blue-600">
                Contato
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-500">
            &copy; {new Date().getFullYear()} Dialer Fusion. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
