export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY no configurada. Saltando envío de correo.');
    return false;
  }

  // To allow testing easily with Resend's free Sandbox, if a domain isn't verified, 
  // Resend will throw an error if sending to third parties. We should warn the user.
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Babyshower <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    });

    if (res.ok) {
      return true;
    } else {
      const errText = await res.text();
      console.error('Error al enviar correo con Resend:', errText);
      return false;
    }
  } catch (error) {
    console.error('Error de conexión con Resend:', error);
    return false;
  }
}

// HTML template helpers for premium aesthetics
export function getRsvpEmailHtml(name: string, isAttending: boolean, guestsCount: number): string {
  const statusText = isAttending ? 'Confirmado - Asistiré' : 'Confirmado - No podré asistir';
  const statusColor = isAttending ? '#386641' : '#b22222';
  
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f4eae1; border-radius: 20px; background-color: #fbf9f6; color: #3a3232;">
      <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #e5989b 0%, #b5828c 100%); border-radius: 12px 12px 0 0; color: white;">
        <h1 style="margin: 0; font-family: Georgia, serif; font-size: 24px; font-weight: normal;">¡Confirmación de Asistencia!</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Baby Shower en camino</p>
      </div>
      
      <div style="padding: 24px; background-color: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <p style="font-size: 16px; margin-top: 0;">Hola <strong>${name}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">Hemos registrado correctamente tu respuesta de asistencia al babyshower.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f4eae1;">
            <td style="padding: 10px 0; color: #726362;">Estado de Asistencia:</td>
            <td style="padding: 10px 0; font-weight: bold; color: ${statusColor};">${statusText}</td>
          </tr>
          ${isAttending ? `
          <tr style="border-bottom: 1px solid #f4eae1;">
            <td style="padding: 10px 0; color: #726362;">Total de Acompañantes:</td>
            <td style="padding: 10px 0; font-weight: bold;">${guestsCount}</td>
          </tr>
          ` : ''}
        </table>
        
        ${isAttending ? `
        <p style="font-size: 14px; color: #726362; line-height: 1.5; font-style: italic;">
          * Recuerda que si deseas hacer un regalo, puedes ver la mesa de regalos en el sitio web y reservar tu selección para que otros invitados lo sepan.
        </p>
        ` : ''}
        
        <hr style="border: 0; border-top: 1px solid #f4eae1; margin: 25px 0;" />
        <div style="text-align: center; font-size: 12px; color: #726362;">
          <p style="margin: 0;">Este es un correo automático. ¡Nos vemos pronto!</p>
        </div>
      </div>
    </div>
  `;
}

export function getGiftReservationEmailHtml(guestName: string, items: string[], eventDetails?: { date?: string; time?: string; location?: string; mapUrl?: string }): string {
  const itemsListHtml = items.map(item => `<li style="margin-bottom: 8px; font-weight: bold;">🎁 ${item}</li>`).join('');
  
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f4eae1; border-radius: 20px; background-color: #fbf9f6; color: #3a3232;">
      <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #e5989b 0%, #b5828c 100%); border-radius: 12px 12px 0 0; color: white;">
        <h1 style="margin: 0; font-family: Georgia, serif; font-size: 24px; font-weight: normal;">¡Muchas Gracias por tu Regalo!</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Tu detalle ha sido reservado con éxito</p>
      </div>
      
      <div style="padding: 24px; background-color: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <p style="font-size: 16px; margin-top: 0;">Hola <strong>${guestName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          Queremos agradecerte enormemente por tu cariño y tu detalle. Hemos bloqueado los siguientes regalos en la lista para que nadie más los elija:
        </p>
        
        <ul style="padding-left: 20px; font-size: 15px; color: #3a3232; margin: 20px 0;">
          ${itemsListHtml}
        </ul>
        
        ${eventDetails && (eventDetails.date || eventDetails.location) ? `
        <div style="background-color: #fbf9f6; padding: 16px; border-radius: 12px; border: 1px solid #f4eae1; margin-top: 24px;">
          <h4 style="margin: 0 0 10px 0; font-family: Georgia, serif; color: #b5828c; font-size: 16px;">Detalles del Evento</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            ${eventDetails.date ? `
            <tr>
              <td style="padding: 4px 0; color: #726362;">Fecha:</td>
              <td style="padding: 4px 0; font-weight: bold;">${eventDetails.date}</td>
            </tr>
            ` : ''}
            ${eventDetails.time ? `
            <tr>
              <td style="padding: 4px 0; color: #726362;">Hora:</td>
              <td style="padding: 4px 0; font-weight: bold;">${eventDetails.time}</td>
            </tr>
            ` : ''}
            ${eventDetails.location ? `
            <tr>
              <td style="padding: 4px 0; color: #726362;">Lugar:</td>
              <td style="padding: 4px 0; font-weight: bold;">${eventDetails.location}</td>
            </tr>
            ` : ''}
          </table>
          ${eventDetails.mapUrl ? `
          <div style="margin-top: 12px; text-align: center;">
            <a href="${eventDetails.mapUrl}" target="_blank" style="display: inline-block; background-color: #a4ac96; color: white; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-size: 12px; font-weight: bold;">Ver en Google Maps</a>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <p style="font-size: 13px; color: #726362; margin-top: 24px; line-height: 1.5;">
          * Si necesitas cambiar o liberar alguno de estos regalos, puedes hacerlo directamente en la página web buscando tus reservas con tu nombre en la sección de gestión de regalos.
        </p>
        
        <hr style="border: 0; border-top: 1px solid #f4eae1; margin: 25px 0;" />
        <div style="text-align: center; font-size: 12px; color: #726362;">
          <p style="margin: 0;">¡Nos vemos en el Babyshower! Con cariño, los futuros papás.</p>
        </div>
      </div>
    </div>
  `;
}

export function getReminderEmailHtml(guestName: string, items: string[], eventDetails: { date: string; time: string; location: string; mapUrl?: string }): string {
  const itemsListHtml = items.map(item => `<li style="margin-bottom: 6px; font-weight: bold;">🎁 ${item}</li>`).join('');
  
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f4eae1; border-radius: 20px; background-color: #fbf9f6; color: #3a3232;">
      <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #a4ac96 0%, #726362 100%); border-radius: 12px 12px 0 0; color: white;">
        <h1 style="margin: 0; font-family: Georgia, serif; font-size: 24px; font-weight: normal;">¡Falta muy poco! 👶</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Recordatorio de tu asistencia y regalo</p>
      </div>
      
      <div style="padding: 24px; background-color: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <p style="font-size: 16px; margin-top: 0;">Hola <strong>${guestName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          ¡Ya falta muy poco para celebrar juntos la llegada de nuestro bebé! Te escribimos este breve recordatorio con los detalles del evento y los regalos que reservaste:
        </p>
        
        <div style="background-color: #fbf9f6; padding: 16px; border-radius: 12px; border: 1px solid #f4eae1; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; font-family: Georgia, serif; color: #726362; font-size: 16px;">Detalles del Evento</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #726362;">Fecha:</td>
              <td style="padding: 4px 0; font-weight: bold;">${eventDetails.date}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #726362;">Hora:</td>
              <td style="padding: 4px 0; font-weight: bold;">${eventDetails.time}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #726362;">Lugar:</td>
              <td style="padding: 4px 0; font-weight: bold;">${eventDetails.location}</td>
            </tr>
          </table>
          ${eventDetails.mapUrl ? `
          <div style="margin-top: 12px; text-align: center;">
            <a href="${eventDetails.mapUrl}" target="_blank" style="display: inline-block; background-color: #a4ac96; color: white; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-size: 12px; font-weight: bold;">Cómo Llegar (Google Maps)</a>
          </div>
          ` : ''}
        </div>
        
        <p style="font-size: 15px; font-weight: bold; margin-bottom: 8px;">Tus Regalos Reservados:</p>
        <ul style="padding-left: 20px; font-size: 15px; color: #3a3232; margin-top: 0; margin-bottom: 24px;">
          ${itemsListHtml}
        </ul>
        
        <p style="font-size: 15px; line-height: 1.6;">
          ¡Estamos muy emocionados de compartir este día contigo! Si tienes cualquier inconveniente de última hora, no dudes en avisarnos.
        </p>
        
        <hr style="border: 0; border-top: 1px solid #f4eae1; margin: 25px 0;" />
        <div style="text-align: center; font-size: 12px; color: #726362;">
          <p style="margin: 0;">¡Te esperamos con los brazos abiertos! Con mucho cariño.</p>
        </div>
      </div>
    </div>
  `;
}
