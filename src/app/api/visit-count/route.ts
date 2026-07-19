import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Use service role key if available for safe increments, otherwise fall back to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetPath = body.path || '/';

    const dbClient = createClient(supabaseUrl, supabaseKey);

    // Call the atomic plpgsql function
    const { data, error } = await dbClient.rpc('increment_visit_count', {
      target_path: targetPath,
    });

    if (error) {
      console.error('[Visit Counter] Error incrementing:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, total_count: Number(data) });
  } catch (err: any) {
    console.error('[Visit Counter] POST Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path') || '/';

    const dbClient = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await dbClient
      .from('page_visits')
      .select('total_count')
      .eq('page_path', targetPath)
      .single();

    if (error) {
      // If table doesn't exist yet or is empty, return 0 instead of throwing error
      return NextResponse.json({ success: true, total_count: 0 });
    }

    return NextResponse.json({ success: true, total_count: Number(data?.total_count || 0) });
  } catch (err: any) {
    console.error('[Visit Counter] GET Exception:', err);
    return NextResponse.json({ success: false, total_count: 0 }, { status: 500 });
  }
}
