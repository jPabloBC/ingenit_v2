// src/app/page.tsx
export const metadata = {
  title: "IngenIT | Automatización e Integración de Procesos",
  description:
    "Desarrollamos software de automatización e integración de procesos críticos, eliminando tareas manuales y conectando sistemas para aumentar la eficiencia empresarial.",
};

import HomeClient from "./HomeClient";

export default function Page() {
  return <HomeClient />;
}
