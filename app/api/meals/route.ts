import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (from && !ISO_DATE.test(from)) {
    return NextResponse.json({ error: "Nieprawidlowy format daty (from)" }, { status: 400 });
  }
  if (to && !ISO_DATE.test(to)) {
    return NextResponse.json({ error: "Nieprawidlowy format daty (to)" }, { status: 400 });
  }

  let query = supabase
    .from("meals")
    .select("*")
    .eq("profile_id", user.id)
    .order("eaten_at", { ascending: false });

  if (from) query = query.gte("eaten_at", from);
  if (to) query = query.lte("eaten_at", to + "T23:59:59");

  const { data, error } = await query;

  if (error) {
    console.error("Meals fetch error:", error);
    return NextResponse.json({ error: "Blad pobierania posilkow" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      meal_type,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      confidence,
      note,
      in_if_window,
      image_base64,
      image_mime,
    } = body;

    let image_url: string | null = null;

    // Upload image to Supabase Storage
    if (image_base64) {
      // Validate image size (~base64 is 4/3 of original)
      const estimatedBytes = (image_base64.length * 3) / 4;
      if (estimatedBytes > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "Zdjecie zbyt duze (max 5 MB)" }, { status: 413 });
      }

      // Validate MIME type
      if (image_mime && !ALLOWED_IMAGE_TYPES.includes(image_mime)) {
        return NextResponse.json({ error: "Niedozwolony typ pliku" }, { status: 400 });
      }

      const buffer = Buffer.from(image_base64, "base64");
      const ext = image_mime?.includes("png") ? "png" : "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("meal-images")
        .upload(fileName, buffer, {
          contentType: image_mime || "image/jpeg",
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
      } else {
        const { data: urlData } = supabase.storage
          .from("meal-images")
          .getPublicUrl(fileName);
        image_url = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("meals")
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
        confidence,
        note: note || null,
        in_if_window: in_if_window ?? true,
        image_url,
        eaten_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ error: "Blad zapisu posilku" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Meals POST error:", error);
    return NextResponse.json({ error: "Blad zapisu posilku" }, { status: 500 });
  }
}

// Edit meal
const ALLOWED_UPDATE_FIELDS = [
  "name", "description", "meal_type", "calories",
  "protein_g", "carbs_g", "fat_g", "fiber_g", "note",
] as const;

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: "Brak ID posilku" }, { status: 400 });
    }

    // Whitelist fields
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (key in fields) {
        updates[key] = fields[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Brak pol do aktualizacji" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("meals")
      .update(updates)
      .eq("id", id)
      .eq("profile_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: "Blad aktualizacji posilku" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Meals PUT error:", error);
    return NextResponse.json({ error: "Blad aktualizacji posilku" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Brak ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("meals")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Blad usuwania posilku" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
