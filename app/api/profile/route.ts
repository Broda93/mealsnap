import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Blad pobierania profilu" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
    }

    const body = await request.json();

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields = [
      "name", "weight_kg", "height_cm", "age", "gender",
      "activity_level", "goal", "daily_calorie_target", "body_fat_percent",
      "if_enabled", "if_protocol", "if_window_start", "if_window_hours",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json({ error: "Blad aktualizacji profilu" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Blad aktualizacji profilu" }, { status: 500 });
  }
}
