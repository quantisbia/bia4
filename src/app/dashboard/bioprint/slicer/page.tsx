import { redirect } from "next/navigation"
/** R20: BioSlicer é a Etapa 3 oficial. Rota antiga mantida como redirecionamento. */
export default function SlicerRedirect() { redirect("/dashboard/bioprint/slice") }
