import { NextResponse } from 'next/server';
import { getRsvps, addRsvp, getConfig, deleteRsvp } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const config = await getConfig();
    const adminPasswordInput = request.headers.get('x-admin-password');
    
    if (adminPasswordInput !== config.adminPassword) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const rsvps = await getRsvps();
    return NextResponse.json(rsvps);
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    return NextResponse.json({ error: 'Failed to fetch RSVPs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }
    
    const rsvpData = {
      name: body.name,
      phone: body.phone || '',
      email: body.email || '',
      guestsCount: typeof body.guestsCount === 'number' ? body.guestsCount : 1,
      isAttending: body.isAttending !== undefined ? !!body.isAttending : true,
      message: body.message || '',
    };
    
    const config = await getConfig();
    const newRsvp = await addRsvp(rsvpData);

    // Send email confirmation if email was provided
    if (rsvpData.email) {
      try {
        const { sendEmail, getRsvpEmailHtml } = await import('@/lib/email');
        const emailHtml = getRsvpEmailHtml(rsvpData.name, rsvpData.isAttending, rsvpData.guestsCount);
        await sendEmail(rsvpData.email.trim(), '¡Confirmación de Asistencia al Baby Shower! 👶', emailHtml);
      } catch (emailErr) {
        console.error('Error sending RSVP confirmation email:', emailErr);
      }
    }

    // Send notifications to organizers if configured
    if (config.organizerEmails) {
      const emailList = config.organizerEmails.split(',').map((e: any) => e.trim()).filter(Boolean);
      if (emailList.length > 0) {
        try {
          const { sendEmail, getOrganizerRsvpNotificationEmailHtml } = await import('@/lib/email');
          const notificationHtml = getOrganizerRsvpNotificationEmailHtml(
            rsvpData.name,
            rsvpData.phone,
            rsvpData.email,
            rsvpData.isAttending,
            rsvpData.guestsCount,
            rsvpData.message
          );
          await Promise.all(
            emailList.map((orgEmail: string) => 
              sendEmail(orgEmail, `🔔 RSVP Babyshower: ${rsvpData.name} (${rsvpData.isAttending ? 'Asistirá' : 'No asistirá'})`, notificationHtml)
            )
          );
        } catch (emailErr) {
          console.error('Error sending RSVP notification to organizers:', emailErr);
        }
      }
    }
    
    return NextResponse.json(newRsvp);
  } catch (error) {
    console.error('Error saving RSVP:', error);
    return NextResponse.json({ error: 'Failed to save RSVP' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const config = await getConfig();
    const adminPasswordInput = request.headers.get('x-admin-password');
    
    if (adminPasswordInput !== config.adminPassword) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const rsvpId = searchParams.get('id');
    
    if (!rsvpId) {
      return NextResponse.json({ error: 'Falta el ID del invitado' }, { status: 400 });
    }
    
    const success = await deleteRsvp(rsvpId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error deleting RSVP:', error);
    return NextResponse.json({ error: 'Failed to delete RSVP' }, { status: 500 });
  }
}
