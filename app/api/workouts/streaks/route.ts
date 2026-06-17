import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("workout_streaks")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    const { data: newData, error: insertError } = await admin
      .from("workout_streaks")
      .insert({ user_id: auth.user.id, streak_days: {} })
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

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const user_id = auth.user.id;
    const today = new Date().toISOString().split("T")[0];

    const admin = getAdminClient();
    const { data: existing } = await admin
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

    const { data, error } = await admin
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
