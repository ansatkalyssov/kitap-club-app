import { redirect } from "next/navigation";

// Пікірлер енді жеке бет емес — әр талқының (клуб жоспарының) ішінде тұрады.
// Ескі сілтемелер клубтар бетіне бағытталады.
export default function AnalysisIndexRedirect() {
  redirect("/clubs");
}
