"use server";

import { getUser } from "@/lib/queries";
import {
  onReadingLogged,
  onTrackerProgress,
  onBookCompleted,
  onAnalysisCreated,
  onClubJoined,
} from "@/lib/points";

// Клиент мутацияны өзі жасайды, содан кейін осы әрекеттерді шақырады.
// Әрқайсысы дерекқордағы нақты күйді өзі тексереді — сондықтан біреу
// бұл әрекеттерді тікелей шақырса да, жұмыс істемей ұпай ала алмайды.

/** Оқу тіркелді → күндік мақсат + streak */
export async function syncReadingPoints(): Promise<number> {
  const user = await getUser();
  if (!user) return 0;
  try {
    return await onReadingLogged(user.id);
  } catch {
    return 0;
  }
}

/** Трекерге прогресс енгізілді */
export async function syncTrackerProgressPoints(trackerId: string): Promise<number> {
  const user = await getUser();
  if (!user) return 0;
  try {
    return await onTrackerProgress(user.id, trackerId);
  } catch {
    return 0;
  }
}

/** Кітап аяқталды */
export async function syncBookCompletedPoints(trackerId: string): Promise<number> {
  const user = await getUser();
  if (!user) return 0;
  try {
    return await onBookCompleted(user.id, trackerId);
  } catch {
    return 0;
  }
}

/** Талдау немесе жауап жазылды */
export async function syncAnalysisPoints(analysisId: string): Promise<number> {
  const user = await getUser();
  if (!user) return 0;
  try {
    return await onAnalysisCreated(user.id, analysisId);
  } catch {
    return 0;
  }
}

/** Клубқа қосылды */
export async function syncClubJoinPoints(clubId: string): Promise<number> {
  const user = await getUser();
  if (!user) return 0;
  try {
    return await onClubJoined(user.id, clubId);
  } catch {
    return 0;
  }
}
