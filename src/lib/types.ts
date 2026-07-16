export type UserRole = "admin" | "facilitator" | "reader";

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface City {
  id: number;
  name: string;
}

export interface Club {
  id: string;
  name: string;
  description: string | null;
  city_id: number | null;
  emblem_url: string | null;
  facilitator_id: string | null;
  is_active: boolean;
  created_at: string;
  cities?: City;
  profiles?: Profile;
  club_members?: { count: number }[];
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  joined_at: string;
  profiles?: Profile;
}

export interface Book {
  id: string;
  title: string;
  author: string | null;
  page_count: number | null;
  cover_url: string | null;
  added_by: string | null;
  created_at: string;
}

export interface ClubPlan {
  id: string;
  club_id: string;
  book_id: string | null;
  month: number;
  year: number;
  start_date: string | null;
  end_date: string | null;
  meeting_date: string | null;
  meeting_location: string | null;
  notes: string | null;
  created_at: string;
  books?: Book;
}

export interface BookTracker {
  id: string;
  user_id: string;
  book_id: string | null;
  club_plan_id: string | null;
  book_title: string;
  book_author: string | null;
  total_pages: number;
  current_page: number;
  start_date: string;
  deadline: string;
  is_completed: boolean;
  created_at: string;
  reading_progress?: ReadingProgress[];
}

export interface ReadingProgress {
  id: string;
  tracker_id: string;
  date: string;
  pages_read: number;
  note: string | null;
  created_at: string;
}

export type ReadingGoalType = "time" | "pages";

export interface ReadingGoal {
  id: string;
  user_id: string;
  goal_type: ReadingGoalType;
  daily_minutes: number | null;
  daily_pages: number | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingLog {
  id: string;
  user_id: string;
  date: string;
  minutes_read: number;
  pages_read: number;
  created_at: string;
}

export interface BookAnalysis {
  id: string;
  club_id: string;
  club_plan_id: string | null;
  author_id: string;
  title: string;
  content: string | null;
  key_insights: string[] | null;
  meeting_date: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  clubs?: Club;
  club_plans?: ClubPlan;
}
