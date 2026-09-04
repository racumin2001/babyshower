import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';

function jsonNoStore(data: unknown, init?: { status?: number }) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function GET() {
  try {
    const config = await getConfig();
    // Exclude adminPassword in standard GET response for security
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { adminPassword, ...publicConfig } = config;
    return jsonNoStore(publicConfig);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = await getConfig();
    
    // Check password from headers or request body
    const adminPasswordInput = request.headers.get('x-admin-password') || body.adminPassword;
    if (adminPasswordInput !== config.adminPassword) {
      return jsonNoStore({ error: 'No autorizado' }, { status: 401 });
    }
    
    const newConfig = {
      ...config,
      date: body.date !== undefined ? body.date : config.date,
      time: body.time !== undefined ? body.time : config.time,
      locationName: body.locationName !== undefined ? body.locationName : config.locationName,
      locationAddress: body.locationAddress !== undefined ? body.locationAddress : config.locationAddress,
      locationNotes: body.locationNotes !== undefined ? body.locationNotes : config.locationNotes,
      locationMapUrl: body.locationMapUrl !== undefined ? body.locationMapUrl : config.locationMapUrl,
      organizerEmails: body.organizerEmails !== undefined ? body.organizerEmails : config.organizerEmails,
      adminPassword: body.newAdminPassword ? body.newAdminPassword : config.adminPassword,
    };
    
    await saveConfig(newConfig);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
