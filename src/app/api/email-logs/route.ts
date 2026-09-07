import { NextResponse } from 'next/server';
import { getConfig, getEmailLogs } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const config = await getConfig();
    const adminPasswordInput = request.headers.get('x-admin-password');

    if (adminPasswordInput !== config.adminPassword) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const logs = await getEmailLogs(80);
    return NextResponse.json(logs, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
  }
}
