/**
 * BIA · Academy · Layout de IMPRESSÃO — R30
 *
 * Route group separado de (app): sem sidebar, fundo branco, tipografia de
 * documento. Usado por /academy/modules/[m]/[aula]/print, que gera a versão
 * integral (todas as seções expandidas) para "Salvar como PDF".
 *
 * A guarda de acesso fica na própria página (mesma regra da aula:
 * matrícula com acesso OU admin).
 */
export default function AcademyPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="academy-print-root min-h-screen bg-white text-gray-900">
      {children}
    </div>
  )
}
