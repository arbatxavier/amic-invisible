import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { exclusions } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  db.delete(exclusions).where(eq(exclusions.id, id)).run();
  return NextResponse.json({ ok: true });
}
