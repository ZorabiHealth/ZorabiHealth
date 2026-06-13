import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000000";

  const { data, error } = await supabase
    .from("workout_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    const { data: newData, error: insertError } = await supabase
      .from("workout_streaks")
      .insert({ user_id: userId, streak_days: {} })
      .select()
      .single();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ data: newData });
  }
  return NextResponse.json({ data });
}

function getConsecutiveStreak(streakDays: Record<string, boolean>): number {
  const dates = Object.keys(streakDays)
    .filter((d) => streakDays[d])
    .sort()
    .reverse();

  if (dates.length === 0) return 0;

  let count = 0;

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    const expectedDate = expected.toISOString().split("T")[0];

    if (dates[i] === expectedDate) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

function getLongestStreak(streakDays: Record<string, boolean>): number {
  const dates = Object.keys(streakDays)
    .filter((d) => streakDays[d])
    .sort();

  if (dates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return Math.max(longest, current);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const user_id = body.user_id || "00000000-0000-0000-0000-000000000000";

    const today = new Date().toISOString().split("T")[0];

    // Get existing streak
    const { data: existing } = await supabase
      .from("workout_streaks")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    const streakDays: Record<string, boolean> = existing?.streak_days || {};

    if (body.completed === true || body.completed === "true") {
      // Toggle today as completed
      streakDays[today] = true;
    } else if (body.toggleDay) {
      const day = body.toggleDay;
      if (streakDays[day]) {
        delete streakDays[day];
      } else {
        streakDays[day] = true;
      }
    }

    const currentStreak = getConsecutiveStreak(streakDays);
    const longestStreak = Math.max(getLongestStreak(streakDays), currentStreak);

    const { data, error } = await supabase
      .from("workout_streaks")
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_workout_date: streakDays[today] ? today : existing?.last_workout_date,
        streak_days: streakDays,
      })
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
