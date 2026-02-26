import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { rateLimit, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
  }

  const rl = rateLimit(user.id, "templates", RATE_LIMITS.templates);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Zbyt wiele zapytan. Sprobuj za ${rl.retryAfter}s.` },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const { data, error } = await supabase
    .from("meal_templates")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Templates fetch error:", error);
    return NextResponse.json({ error: "Blad pobierania szablonow" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
  }

  const rl = rateLimit(user.id, "templates", RATE_LIMITS.templates);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Zbyt wiele zapisan. Sprobuj za ${rl.retryAfter}s.` },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const body = await request.json();
  const { name, description, meal_type, calories, protein_g, carbs_g, fat_g, fiber_g } = body;

  const { data, error } = await supabase
    .from("meal_templates")
    .insert({
      profile_id: user.id,
      name,
      description,
      meal_type,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
    })
    .select()
    .single();

  if (error) {
    console.error("Template insert error:", error);
    return NextResponse.json({ error: "Blad zapisu szablonu" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
  }

  const rl = rateLimit(user.id, "templates", RATE_LIMITS.templates);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Zbyt wiele usuniec. Sprobuj za ${rl.retryAfter}s.` },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Brak ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("meal_templates")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) {
    console.error("Template delete error:", error);
    return NextResponse.json({ error: "Blad usuwania szablonu" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
