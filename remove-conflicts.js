const fs = require("fs")
const path = require("path")

// Arquivos conflitantes a serem removidos
const conflictingFiles = ["pages/assistants/[id]/edit.tsx", "pages/assistants/index.tsx"]

// Remover cada arquivo conflitante
conflictingFiles.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath)

  // Verificar se o arquivo existe antes de tentar removê-lo
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath)
      console.log(`Arquivo removido com sucesso: ${filePath}`)
    } catch (err) {
      console.error(`Erro ao remover arquivo ${filePath}:`, err)
    }
  } else {
    console.log(`Arquivo não encontrado: ${filePath}`)
  }
})

// Verificar se o diretório pages está vazio e removê-lo se estiver
const pagesDir = path.join(process.cwd(), "pages")
if (fs.existsSync(pagesDir)) {
  try {
    const files = fs.readdirSync(pagesDir)
    if (files.length === 0) {
      fs.rmdirSync(pagesDir)
      console.log("Diretório pages removido com sucesso (estava vazio)")
    } else {
      console.log("Diretório pages não está vazio, mantendo-o")
    }
  } catch (err) {
    console.error("Erro ao verificar ou remover diretório pages:", err)
  }
}

console.log("Processo de remoção de conflitos concluído")
