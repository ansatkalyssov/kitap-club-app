import toast from "react-hot-toast";

/**
 * Жиналған ұпайды көрсетеді. 0 болса үнсіз өтеді — шек толған немесе
 * қақпадан өтпеген жағдайда қолданушыны шатастырмау үшін.
 */
export function toastPoints(earned: number) {
  if (earned > 0) {
    toast.success(`+${earned} ұпай`, { icon: "⭐" });
  }
}
