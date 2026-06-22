// Espelha a lógica de cálculo compartilhada (fonte única em src/lib) para dentro
// de functions/src/_shared, para que a Cloud Function compile e empacote a MESMA
// lógica usada pelo frontend — sem duplicar fonte editável.
//
// Roda no `npm run build` das functions (antes do tsc). O diretório _shared é
// gerado e gitignored: NUNCA editar à mão; editar sempre em src/lib / src/types.
import { mkdirSync, copyFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const sharedDir = join(here, 'src', '_shared')

// Allowlist EXPLÍCITA: só as libs puras de cálculo que o snapshot precisa.
// Não copiar tudo de src/lib — há arquivos acoplados ao Vite (ex.: sentry.ts
// usa import.meta.env) que não compilam nas functions.
const LIBS = [
  'classificacao.ts',
  'melhoresTerceiros.ts',
  'chaveamento.ts',
  'bracketUsuario.ts',
  'clinchGrupo.ts',
  'resultadosOficiais.ts',
  'resolverProvisorio.ts',
  'snapshotResultados.ts',
]

rmSync(sharedDir, { recursive: true, force: true })
mkdirSync(join(sharedDir, 'lib'), { recursive: true })
mkdirSync(join(sharedDir, 'types'), { recursive: true })

const libSrc = join(root, 'src', 'lib')
for (const f of LIBS) {
  copyFileSync(join(libSrc, f), join(sharedDir, 'lib', f))
}
// Copia os tipos de cálculo (livres de Timestamp).
copyFileSync(join(root, 'src', 'types', 'calc.ts'), join(sharedDir, 'types', 'calc.ts'))

console.log(`[copy-shared] ${LIBS.length} libs + types/calc.ts → functions/src/_shared`)
