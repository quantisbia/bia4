/**
 * BIA i18n — dicionários pt-BR / en-US / es-ES
 *
 * Estratégia: dicionário plano com chaves dot-namespaced, fácil de manter,
 * sem dependência externa (zero bundle overhead).
 * Uso: t("common.save") → "Salvar" / "Save" / "Guardar"
 */

export type Locale = "pt" | "en" | "es"

export const LOCALES: Locale[] = ["pt", "en", "es"]

export const LOCALE_LABELS: Record<Locale, { label: string; flag: string; nativeName: string }> = {
  pt: { label: "Português", flag: "🇧🇷", nativeName: "Português" },
  en: { label: "English", flag: "🇺🇸", nativeName: "English" },
  es: { label: "Español", flag: "🇪🇸", nativeName: "Español" },
}

/**
 * Dicionário principal. Toda nova string deve passar por aqui.
 * Chaves em dot-namespace por contexto (common, nav, bioprint, etc).
 */
export const DICTIONARIES = {
  pt: {
    // Comum / ações
    "common.save": "Salvar",
    "common.cancel": "Cancelar",
    "common.delete": "Excluir",
    "common.edit": "Editar",
    "common.close": "Fechar",
    "common.open": "Abrir",
    "common.loading": "Carregando...",
    "common.error": "Erro",
    "common.success": "Sucesso",
    "common.confirm": "Confirmar",
    "common.back": "Voltar",
    "common.next": "Próximo",
    "common.previous": "Anterior",
    "common.search": "Buscar",
    "common.filter": "Filtrar",
    "common.export": "Exportar",
    "common.import": "Importar",
    "common.download": "Baixar",
    "common.upload": "Enviar",
    "common.copy": "Copiar",
    "common.copied": "Copiado!",
    "common.settings": "Configurações",
    "common.help": "Ajuda",
    "common.upgrade": "Upgrade",
    "common.low_balance": "Saldo baixo!",
    "common.credits": "créditos",
    "common.notifications": "Notificações",
    "common.appearance": "Aparência",
    "common.language": "Idioma",
    "common.theme": "Tema",
    "common.light": "Claro",
    "common.dark": "Escuro",
    "common.system": "Sistema",

    // Navegação
    "nav.dashboard": "Dashboard",
    "nav.bioprint": "Bioimpressão",
    "nav.biomaterials": "Biomateriais",
    "nav.chat": "Chat BIA",
    "nav.pipeline": "Pipeline",
    "nav.organoids": "Organoides",
    "nav.tissues": "Tecidos",
    "nav.billing": "Faturamento",
    "nav.profile": "Perfil",
    "nav.logout": "Sair",
    "nav.admin": "Admin",

    // Bioprint / Slice
    "bioprint.title": "Bioimpressão",
    "bioprint.tab.tissue": "Tecido",
    "bioprint.tab.params": "Parâmetros",
    "bioprint.tab.wells": "Poços",
    "bioprint.tab.gcode": "G-code",
    "bioprint.printer.prep": "Preparar bioimpressora",
    "bioprint.printer.prep_desc": "Conecte, controle eixos e teste a bioimpressora antes de iniciar a impressão",
    "bioprint.tissue.designer": "Designer de Tecido Biomimético",
    "bioprint.tissue.score": "Score biomimético",
    "bioprint.tissue.family": "Família de tecido",
    "bioprint.tissue.profile": "Perfil de tecido",
    "bioprint.tissue.pattern": "Padrão de preenchimento",
    "bioprint.tissue.pore_size": "Tamanho de poro",
    "bioprint.tissue.porosity": "Porosidade",
    "bioprint.tissue.infill": "Densidade de infill",
    "bioprint.tissue.bioink": "Bioink recomendado",
    "bioprint.tissue.cells": "Tipos celulares",
    "bioprint.tissue.print_params": "Parâmetros de impressão",
    "bioprint.tissue.post_processing": "Pós-processamento",

    // Auth
    "auth.login": "Entrar",
    "auth.logout": "Sair",
    "auth.signup": "Criar conta",
    "auth.email": "E-mail",
    "auth.password": "Senha",
    "auth.forgot": "Esqueci a senha",

    // Plataforma / marketing
    "platform.name": "BIA - Biofabrication Intelligent Assistant",
    "platform.tagline": "Plataforma de IA para biofabricação",
  },

  en: {
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.close": "Close",
    "common.open": "Open",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.export": "Export",
    "common.import": "Import",
    "common.download": "Download",
    "common.upload": "Upload",
    "common.copy": "Copy",
    "common.copied": "Copied!",
    "common.settings": "Settings",
    "common.help": "Help",
    "common.upgrade": "Upgrade",
    "common.low_balance": "Low balance!",
    "common.credits": "credits",
    "common.notifications": "Notifications",
    "common.appearance": "Appearance",
    "common.language": "Language",
    "common.theme": "Theme",
    "common.light": "Light",
    "common.dark": "Dark",
    "common.system": "System",

    "nav.dashboard": "Dashboard",
    "nav.bioprint": "Bioprinting",
    "nav.biomaterials": "Biomaterials",
    "nav.chat": "BIA Chat",
    "nav.pipeline": "Pipeline",
    "nav.organoids": "Organoids",
    "nav.tissues": "Tissues",
    "nav.billing": "Billing",
    "nav.profile": "Profile",
    "nav.logout": "Logout",
    "nav.admin": "Admin",

    "bioprint.title": "Bioprinting",
    "bioprint.tab.tissue": "Tissue",
    "bioprint.tab.params": "Parameters",
    "bioprint.tab.wells": "Wells",
    "bioprint.tab.gcode": "G-code",
    "bioprint.printer.prep": "Prepare bioprinter",
    "bioprint.printer.prep_desc": "Connect, control axes and test the bioprinter before starting the print",
    "bioprint.tissue.designer": "Biomimetic Tissue Designer",
    "bioprint.tissue.score": "Biomimetic score",
    "bioprint.tissue.family": "Tissue family",
    "bioprint.tissue.profile": "Tissue profile",
    "bioprint.tissue.pattern": "Infill pattern",
    "bioprint.tissue.pore_size": "Pore size",
    "bioprint.tissue.porosity": "Porosity",
    "bioprint.tissue.infill": "Infill density",
    "bioprint.tissue.bioink": "Recommended bioink",
    "bioprint.tissue.cells": "Cell types",
    "bioprint.tissue.print_params": "Print parameters",
    "bioprint.tissue.post_processing": "Post-processing",

    "auth.login": "Sign in",
    "auth.logout": "Sign out",
    "auth.signup": "Sign up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.forgot": "Forgot password",

    "platform.name": "BIA - Biofabrication Intelligent Assistant",
    "platform.tagline": "AI platform for biofabrication",
  },

  es: {
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.close": "Cerrar",
    "common.open": "Abrir",
    "common.loading": "Cargando...",
    "common.error": "Error",
    "common.success": "Éxito",
    "common.confirm": "Confirmar",
    "common.back": "Volver",
    "common.next": "Siguiente",
    "common.previous": "Anterior",
    "common.search": "Buscar",
    "common.filter": "Filtrar",
    "common.export": "Exportar",
    "common.import": "Importar",
    "common.download": "Descargar",
    "common.upload": "Subir",
    "common.copy": "Copiar",
    "common.copied": "¡Copiado!",
    "common.settings": "Ajustes",
    "common.help": "Ayuda",
    "common.upgrade": "Mejorar plan",
    "common.low_balance": "¡Saldo bajo!",
    "common.credits": "créditos",
    "common.notifications": "Notificaciones",
    "common.appearance": "Apariencia",
    "common.language": "Idioma",
    "common.theme": "Tema",
    "common.light": "Claro",
    "common.dark": "Oscuro",
    "common.system": "Sistema",

    "nav.dashboard": "Panel",
    "nav.bioprint": "Bioimpresión",
    "nav.biomaterials": "Biomateriales",
    "nav.chat": "Chat BIA",
    "nav.pipeline": "Flujo",
    "nav.organoids": "Organoides",
    "nav.tissues": "Tejidos",
    "nav.billing": "Facturación",
    "nav.profile": "Perfil",
    "nav.logout": "Cerrar sesión",
    "nav.admin": "Admin",

    "bioprint.title": "Bioimpresión",
    "bioprint.tab.tissue": "Tejido",
    "bioprint.tab.params": "Parámetros",
    "bioprint.tab.wells": "Pozos",
    "bioprint.tab.gcode": "G-code",
    "bioprint.printer.prep": "Preparar bioimpresora",
    "bioprint.printer.prep_desc": "Conecte, controle ejes y pruebe la bioimpresora antes de iniciar la impresión",
    "bioprint.tissue.designer": "Diseñador de Tejido Biomimético",
    "bioprint.tissue.score": "Puntuación biomimética",
    "bioprint.tissue.family": "Familia de tejido",
    "bioprint.tissue.profile": "Perfil de tejido",
    "bioprint.tissue.pattern": "Patrón de relleno",
    "bioprint.tissue.pore_size": "Tamaño de poro",
    "bioprint.tissue.porosity": "Porosidad",
    "bioprint.tissue.infill": "Densidad de relleno",
    "bioprint.tissue.bioink": "Bioink recomendado",
    "bioprint.tissue.cells": "Tipos celulares",
    "bioprint.tissue.print_params": "Parámetros de impresión",
    "bioprint.tissue.post_processing": "Post-procesamiento",

    "auth.login": "Iniciar sesión",
    "auth.logout": "Cerrar sesión",
    "auth.signup": "Registrarse",
    "auth.email": "Correo",
    "auth.password": "Contraseña",
    "auth.forgot": "Olvidé mi contraseña",

    "platform.name": "BIA - Biofabrication Intelligent Assistant",
    "platform.tagline": "Plataforma de IA para biofabricación",
  },
} as const

export type TranslationKey = keyof (typeof DICTIONARIES)["pt"]

/**
 * Mapeia código de locale para tag de HTML lang
 */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
}

/**
 * Detecta locale a partir do navigator (client-side)
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "pt"
  const lang = (navigator.language || "pt").toLowerCase()
  if (lang.startsWith("en")) return "en"
  if (lang.startsWith("es")) return "es"
  return "pt"
}
