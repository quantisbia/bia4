/**
 * Ícones vetoriais próprios para a landing de Odontologia (R31.2).
 * Lucide não tem dente/implante/scaffold — aqui ficam SVGs simples (stroke 1.8,
 * viewBox 24) no mesmo estilo visual do lucide-react.
 */
import type { SVGProps } from "react"

type P = SVGProps<SVGSVGElement>
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const

/** Dente (coroa + duas raízes) */
export function ToothIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M7.2 3.5c1.6 0 2.4.9 4.8.9s3.2-.9 4.8-.9c2.6 0 4 2.3 3.6 5-.3 2.1-1.3 3.2-1.6 5.2-.4 2.7-.9 7.3-2.7 7.3-1.6 0-1.7-4.3-4.1-4.3S10.2 21 8.6 21c-1.8 0-2.3-4.6-2.7-7.3-.3-2-1.3-3.1-1.6-5.2-.4-2.7 1-5 3-5Z" />
    </svg>
  )
}

/** Implante dentário (parafuso + coroa) */
export function ImplantIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M8 3h8l-1 4H9L8 3Z" />
      <path d="M9.5 7v2.5M14.5 7v2.5" />
      <path d="M9.5 9.5h5l-.6 10.2a1.9 1.9 0 0 1-3.8 0L9.5 9.5Z" />
      <path d="M9.9 12.5h4.2M10.2 15.5h3.6M10.6 18.5h2.8" />
    </svg>
  )
}

/** Scaffold poroso (grade 0/90 com poros) */
export function ScaffoldIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      <circle cx="6" cy="6" r=".6" fill="currentColor" /><circle cx="12" cy="12" r=".6" fill="currentColor" /><circle cx="18" cy="18" r=".6" fill="currentColor" />
      <circle cx="18" cy="6" r=".6" fill="currentColor" /><circle cx="6" cy="18" r=".6" fill="currentColor" />
    </svg>
  )
}

/** Bico de extrusão depositando filamento (bioimpressão) */
export function NozzleIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M8 3h8v5l-2 3h-4L8 8V3Z" />
      <path d="M11 11v3h2v-3" />
      <path d="M12 14v2.5" />
      <path d="M4 20c2-1.6 4-1.6 6 0s4 1.6 6 0 3-1.3 4-.6" />
    </svg>
  )
}

/** Mandíbula / arco dental */
export function JawIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 10c0-4.4 3.6-7 8-7s8 2.6 8 7v4c0 2.5-1.5 4-3.5 4H16l-1-3h-6l-1 3H7.5C5.5 18 4 16.5 4 14v-4Z" />
      <path d="M8 10.5h8M9.5 7.5v3M12 7v3.5M14.5 7.5v3" />
    </svg>
  )
}

/** Tomografia / planejamento digital (CBCT → STL) */
export function ScanIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M12 7.5 16 10v4l-4 2.5L8 14v-4l4-2.5Z" />
      <path d="M12 7.5v9M8 10l4 2 4-2" />
    </svg>
  )
}

/** Osso / regeneração óssea (com célula) */
export function BoneCellIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M17 10c1.7 0 3-1.3 3-3a3 3 0 0 0-5.6-1.5L9.1 10.8A3 3 0 1 0 5 15a3 3 0 1 0 4.2 4.2l5.3-5.3A3 3 0 1 0 17 10Z" />
      <circle cx="12" cy="12" r="1.3" />
    </svg>
  )
}

/** Membrana / enxerto em camadas (ROG) */
export function MembraneIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 8c3-2.5 6-2.5 9 0s6 2.5 9 0" />
      <path d="M3 12c3-2.5 6-2.5 9 0s6 2.5 9 0" />
      <path d="M3 16c3-2.5 6-2.5 9 0s6 2.5 9 0" />
      <circle cx="7" cy="14" r=".7" fill="currentColor" /><circle cx="15" cy="13.5" r=".7" fill="currentColor" /><circle cx="11" cy="10" r=".7" fill="currentColor" />
    </svg>
  )
}
