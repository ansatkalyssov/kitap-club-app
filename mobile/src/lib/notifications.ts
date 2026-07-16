import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const REMINDER_ID = "daily-reading-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function setDailyReminder(time: string): Promise<boolean> {
  const granted = await ensureNotificationPermissions();
  if (!granted) return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Еске салғыштар",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const [hour, minute] = time.split(":").map(Number);

  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: "Кітап оқу уақыты келді 📖",
      body: "Бүгінгі мақсатыңызды әлі орындаған жоқсыз. Бірнеше бет оқып алыңыз!",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
}
