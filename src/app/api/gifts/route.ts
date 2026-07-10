import { NextResponse } from 'next/server';
import { getGifts, reserveGift, unreserveGift, addGift, deleteGift, getConfig } from '@/lib/db';
import { sendEmail, getGiftReservationEmailHtml } from '@/lib/email';

export async function GET() {
  try {
    const gifts = await getGifts();
    return NextResponse.json(gifts);
  } catch (error) {
    console.error('Error fetching gifts:', error);
    return NextResponse.json({ error: 'Failed to fetch gifts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (!action) {
      return NextResponse.json({ error: 'Falta la acción (action)' }, { status: 400 });
    }
    
    // Auth check helper for admin actions
    const checkAdminAuth = async () => {
      const config = await getConfig();
      const adminPasswordInput = request.headers.get('x-admin-password') || body.adminPassword;
      return adminPasswordInput === config.adminPassword;
    };
    
    switch (action) {
      case 'reserve': {
        const { giftId, reservedBy, reservedEmail } = body;
        if (!giftId || !reservedBy || !reservedEmail) {
          return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        // Fetch gifts to verify it exists and get its name
        const gifts = await getGifts();
        const gift = gifts.find(g => g.id === giftId);
        if (!gift) {
          return NextResponse.json({ error: 'El regalo no existe' }, { status: 404 });
        }

        const success = await reserveGift(giftId, reservedBy.trim(), reservedEmail.trim());
        if (success) {
          try {
            const config = await getConfig();
            const eventDetails = {
              date: config.date,
              time: config.time || 'Por definir',
              location: config.locationName ? `${config.locationName} (${config.locationAddress})` : config.locationAddress || 'Por definir',
              mapUrl: config.locationMapUrl || undefined,
            };
            const html = getGiftReservationEmailHtml(reservedBy.trim(), [gift.name], eventDetails);
            await sendEmail(reservedEmail.trim(), '¡Muchas Gracias por tu Regalo! 🎁', html);

            // Notify organizers
            if (config.organizerEmails) {
              const emailList = config.organizerEmails.split(',').map((e: any) => e.trim()).filter(Boolean);
              if (emailList.length > 0) {
                const { getOrganizerGiftNotificationEmailHtml } = await import('@/lib/email');
                const notificationHtml = getOrganizerGiftNotificationEmailHtml(reservedBy.trim(), reservedEmail.trim(), gift.name);
                await Promise.all(
                  emailList.map((orgEmail: string) =>
                    sendEmail(orgEmail, `🎁 Regalo Reservado: ${gift.name} por ${reservedBy.trim()}`, notificationHtml)
                  )
                );
              }
            }
          } catch (emailErr) {
            console.error('Error sending confirmation email:', emailErr);
          }
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({ error: 'El regalo ya está reservado o no existe' }, { status: 409 });
        }
      }
      
      case 'unreserve': {
        const { giftId } = body;
        if (!giftId) {
          return NextResponse.json({ error: 'Falta el ID del regalo' }, { status: 400 });
        }
        
        // Admin authorization check
        const isAuthorized = await checkAdminAuth();
        if (!isAuthorized) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
        
        const success = await unreserveGift(giftId);
        return NextResponse.json({ success });
      }
      
      case 'add': {
        const { name, category, imageUrl } = body;
        if (!name || !category) {
          return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }
        
        const isAuthorized = await checkAdminAuth();
        if (!isAuthorized) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
        
        const newGift = await addGift({ name, category, imageUrl });
        return NextResponse.json(newGift);
      }
      
      case 'delete': {
        const { giftId } = body;
        if (!giftId) {
          return NextResponse.json({ error: 'Falta el ID del regalo' }, { status: 400 });
        }
        
        const isAuthorized = await checkAdminAuth();
        if (!isAuthorized) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
        
        const success = await deleteGift(giftId);
        return NextResponse.json({ success });
      }
      
      case 'reserve_surprise': {
        const { name, reservedBy, reservedEmail } = body;
        if (!name || !reservedBy || !reservedEmail) {
          return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }
        
        // Create custom surprise gift entry
        const newGift = await addGift({
          name: `Regalo Sorpresa: ${name.trim()}`,
          category: 'Sorpresa',
          imageUrl: '',
        });
        
        const success = await reserveGift(newGift.id, reservedBy.trim(), reservedEmail.trim());
        if (success) {
          try {
            const config = await getConfig();
            const eventDetails = {
              date: config.date,
              time: config.time || 'Por definir',
              location: config.locationName ? `${config.locationName} (${config.locationAddress})` : config.locationAddress || 'Por definir',
              mapUrl: config.locationMapUrl || undefined,
            };
            const html = getGiftReservationEmailHtml(reservedBy.trim(), [newGift.name], eventDetails);
            await sendEmail(reservedEmail.trim(), '¡Muchas Gracias por tu Regalo! 🎁', html);

            // Notify organizers
            if (config.organizerEmails) {
              const emailList = config.organizerEmails.split(',').map((e: any) => e.trim()).filter(Boolean);
              if (emailList.length > 0) {
                const { getOrganizerGiftNotificationEmailHtml } = await import('@/lib/email');
                const notificationHtml = getOrganizerGiftNotificationEmailHtml(reservedBy.trim(), reservedEmail.trim(), newGift.name);
                await Promise.all(
                  emailList.map((orgEmail: string) =>
                    sendEmail(orgEmail, `🎁 Regalo Reservado: ${newGift.name} por ${reservedBy.trim()}`, notificationHtml)
                  )
                );
              }
            }
          } catch (emailErr) {
            console.error('Error sending surprise confirmation email:', emailErr);
          }
          return NextResponse.json({ success: true, gift: newGift });
        } else {
          return NextResponse.json({ error: 'No se pudo reservar el regalo sorpresa' }, { status: 500 });
        }
      }

      case 'unreserve_by_guest': {
        const { giftId, guestName } = body;
        if (!giftId || !guestName) {
          return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }
        
        // Fetch gifts to verify guest name
        const gifts = await getGifts();
        const gift = gifts.find(g => g.id === giftId);
        
        if (!gift) {
          return NextResponse.json({ error: 'El regalo no existe' }, { status: 404 });
        }
        
        if (!gift.reservedBy || gift.reservedBy.toLowerCase().trim() !== guestName.toLowerCase().trim()) {
          return NextResponse.json({ error: 'El nombre de reserva no coincide' }, { status: 403 });
        }
        
        // Unreserve
        const success = await unreserveGift(giftId);
        
        // If it was a custom surprise gift, delete it entirely so it doesn't clutter the DB
        if (success && gift.category === 'Sorpresa') {
          await deleteGift(giftId);
        }
        
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error handling gift action:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
