'use client';

import { useState, useEffect } from 'react';
import { SkyDecor } from '@/components/SkyDecor';
import { GiftIdeaArt } from '@/components/GiftIdeaArt';

interface EventConfig {
  date: string;
  time: string;
  locationName: string;
  locationAddress: string;
  locationNotes?: string;
  locationMapUrl: string;
}

interface Gift {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  reservedBy?: string | null;
  reservedAt?: string | null;
}

export default function Home() {
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'reserved'>('all');

  // RSVP Form state
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpPhone, setRsvpPhone] = useState('');
  const [rsvpEmail, setRsvpEmail] = useState('');
  const [rsvpGuests, setRsvpGuests] = useState(1);
  const [rsvpAttending, setRsvpAttending] = useState(true);
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submittingRsvp, setSubmittingRsvp] = useState(false);

  // Reservation Modal state
  const [reservingGift, setReservingGift] = useState<Gift | null>(null);
  const [reserveGuestName, setReserveGuestName] = useState('');
  const [reserveGuestEmail, setReserveGuestEmail] = useState('');
  const [reserveStatus, setReserveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submittingReservation, setSubmittingReservation] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  const [activeGiftTab, setActiveGiftTab] = useState<'surprise' | 'diapers' | 'catalog' | 'have'>('surprise');

  // Surprise Gift states
  const [surpriseModalOpen, setSurpriseModalOpen] = useState(false);
  const [surpriseGiftName, setSurpriseGiftName] = useState('');
  const [surpriseGuestName, setSurpriseGuestName] = useState('');
  const [surpriseGuestEmail, setSurpriseGuestEmail] = useState('');
  const [submittingSurprise, setSubmittingSurprise] = useState(false);
  const [surpriseStatus, setSurpriseStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Guest Management states
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [lookupName, setLookupName] = useState('');
  const [myReservations, setMyReservations] = useState<Gift[]>([]);
  const [lookupPerformed, setLookupPerformed] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [releaseStatus, setReleaseStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const cacheBust = Date.now();
        const [configRes, giftsRes] = await Promise.all([
          fetch(`/api/config?ts=${cacheBust}`, { cache: 'no-store' }),
          fetch(`/api/gifts?ts=${cacheBust}`, { cache: 'no-store' })
        ]);
        
        if (configRes.ok && giftsRes.ok) {
          const configData = await configRes.json();
          const giftsData = await giftsRes.json();
          setConfig(configData);
          setGifts(giftsData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Countdown effect
  useEffect(() => {
    if (!config?.date) {
      setTimeLeft(null);
      return;
    }

    const [year, month, day] = config.date.split('-').map(Number);
    const timeMatch = config.time?.match(/(\d{1,2}):(\d{2})/);
    const hours = timeMatch ? Number(timeMatch[1]) : 0;
    const minutes = timeMatch ? Number(timeMatch[2]) : 0;
    const targetDate = new Date(year, month - 1, day, hours, minutes);
    if (!year || !month || !day || isNaN(targetDate.getTime())) {
      setTimeLeft(null);
      return;
    }

    const updateCountdown = () => {
      const difference = targetDate.getTime() - Date.now();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return false;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
      return true;
    };

    updateCountdown();
    const interval = setInterval(() => {
      if (!updateCountdown()) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [config?.date, config?.time]);

  // Handle RSVP Submit
  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim()) return;

    setSubmittingRsvp(true);
    setRsvpStatus(null);

    try {
      const res = await fetch('/api/rsvps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rsvpName,
          phone: rsvpPhone,
          email: rsvpEmail,
          guestsCount: rsvpGuests,
          isAttending: rsvpAttending,
          message: rsvpMessage,
        }),
      });

      if (res.ok) {
        setRsvpStatus({
          type: 'success',
          message: rsvpAttending 
            ? '¡Gracias! Tu asistencia ha sido registrada con éxito.' 
            : 'Gracias por avisarnos. Registramos tu respuesta.',
        });
        // Clear form
        setRsvpName('');
        setRsvpPhone('');
        setRsvpEmail('');
        setRsvpGuests(1);
        setRsvpMessage('');
      } else {
        throw new Error('Response error');
      }
    } catch (err) {
      console.error(err);
      setRsvpStatus({ type: 'error', message: 'Hubo un error al registrar tu asistencia. Por favor, intenta de nuevo.' });
    } finally {
      setSubmittingRsvp(false);
    }
  };

  // Handle Gift Reservation Submit
  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservingGift || !reserveGuestName.trim() || !reserveGuestEmail.trim()) return;

    setSubmittingReservation(true);
    setReserveStatus(null);

    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reserve',
          giftId: reservingGift.id,
          reservedBy: reserveGuestName.trim(),
          reservedEmail: reserveGuestEmail.trim(),
        }),
      });

      if (res.ok) {
        setReserveStatus({
          type: 'success',
          message: `¡Muchas gracias! Reservamos "${reservingGift.name}". Te enviamos una confirmación por correo.`,
        });
        // Update local gifts state
        setGifts(prevGifts => 
          prevGifts.map(g => 
            g.id === reservingGift.id 
              ? { ...g, reservedBy: reserveGuestName.trim(), reservedEmail: reserveGuestEmail.trim(), reservedAt: new Date().toISOString() } 
              : g
          )
        );
        setTimeout(() => {
          setReservingGift(null);
          setReserveGuestName('');
          setReserveGuestEmail('');
          setReserveStatus(null);
        }, 2500);
      } else {
        const errorData = await res.json();
        setReserveStatus({
          type: 'error',
          message: errorData.error || 'Este regalo ya ha sido reservado por alguien más. Elige otro por favor.',
        });
      }
    } catch (err) {
      console.error(err);
      setReserveStatus({ type: 'error', message: 'Ocurrió un error. Intenta reservar nuevamente.' });
    } finally {
      setSubmittingReservation(false);
    }
  };

  // Handle Surprise Gift submit
  const handleSurpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surpriseGuestName.trim() || !surpriseGiftName.trim() || !surpriseGuestEmail.trim()) return;

    setSubmittingSurprise(true);
    setSurpriseStatus(null);

    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reserve_surprise',
          name: surpriseGiftName.trim(),
          reservedBy: surpriseGuestName.trim(),
          reservedEmail: surpriseGuestEmail.trim(),
        }),
      });

      if (res.ok) {
        setSurpriseStatus({
          type: 'success',
          message: '¡Muchas gracias! Registramos tu regalo sorpresa con éxito y te enviamos una confirmación por correo.',
        });
        
        // Re-fetch gifts to get the new custom surprise gift
        const giftsRes = await fetch('/api/gifts');
        if (giftsRes.ok) {
          setGifts(await giftsRes.json());
        }

        setTimeout(() => {
          setSurpriseModalOpen(false);
          setSurpriseGiftName('');
          setSurpriseGuestName('');
          setSurpriseGuestEmail('');
          setSurpriseStatus(null);
        }, 2500);
      } else {
        throw new Error('Response error');
      }
    } catch (err) {
      console.error(err);
      setSurpriseStatus({ type: 'error', message: 'Hubo un error al registrar el regalo sorpresa. Por favor intenta de nuevo.' });
    } finally {
      setSubmittingSurprise(false);
    }
  };

  // Handle Lookup Reservations
  const handleLookupReservations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupName.trim()) return;

    setLookupLoading(true);
    setLookupPerformed(false);
    setReleaseStatus(null);

    try {
      // Re-fetch gifts to get latest status
      const giftsRes = await fetch('/api/gifts');
      if (giftsRes.ok) {
        const latestGifts: Gift[] = await giftsRes.json();
        setGifts(latestGifts);
        
        // Filter those reserved by name
        const nameQuery = lookupName.trim().toLowerCase();
        const found = latestGifts.filter(g => g.reservedBy?.toLowerCase().trim() === nameQuery);
        setMyReservations(found);
        setLookupPerformed(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLookupLoading(false);
    }
  };

  // Handle Release Reservation
  const handleReleaseReservation = async (giftId: string, giftName: string) => {
    if (!confirm(`¿Estás seguro de liberar tu reserva para "${giftName}"? Volverá a estar disponible para otros invitados.`)) return;

    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unreserve_by_guest',
          giftId,
          guestName: lookupName.trim(),
        }),
      });

      if (res.ok) {
        setReleaseStatus({
          type: 'success',
          message: `La reserva de "${giftName}" ha sido cancelada con éxito.`,
        });

        // Update local state: remove or unreserve in local list
        setGifts(prev => {
          const gift = prev.find(g => g.id === giftId);
          if (gift?.category === 'Sorpresa') {
            return prev.filter(g => g.id !== giftId);
          }
          return prev.map(g => g.id === giftId ? { ...g, reservedBy: null, reservedAt: null } : g);
        });

        // Update lookup list
        setMyReservations(prev => prev.filter(g => g.id !== giftId));
      } else {
        const errorData = await res.json();
        setReleaseStatus({
          type: 'error',
          message: errorData.error || 'No se pudo liberar la reserva. Verifica el nombre.',
        });
      }
    } catch (err) {
      console.error(err);
      setReleaseStatus({ type: 'error', message: 'Error de conexión.' });
    }
  };

  // Get categories list (excluding Pañales)
  const categories = ['Todos', ...Array.from(new Set(gifts.filter(g => g.category !== 'Pañales').map(g => g.category)))];

  // Filter gifts logic (excluding Pañales)
  const filteredGifts = gifts.filter(gift => {
    if (gift.category === 'Pañales') return false;
    const matchesSearch = gift.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          gift.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || gift.category === selectedCategory;
    const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'available' && !gift.reservedBy) ||
                          (statusFilter === 'reserved' && gift.reservedBy);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Diaper tracker data
  const diaperData = [
    {
      code: 'rn',
      title: 'Talla RN (Recién Nacido)',
      description: 'RN: Vienen entre 34 y 40 pañales por paquete.',
      total: 4,
      prefix: 'diaper_rn_',
    },
    {
      code: 'p',
      title: 'Talla P (Pequeño)',
      description: 'Talla P: Vienen entre 50 y 56 pañales por paquete.',
      total: 12,
      prefix: 'diaper_p_',
    },
    {
      code: 'm',
      title: 'Talla M (Mediano)',
      description: 'Talla M: Vienen entre 68 y 72 pañales por paquete.',
      total: 12,
      prefix: 'diaper_m_',
    },
    {
      code: 'g',
      title: 'Talla G (Grande)',
      description: 'Talla G: Vienen entre 56 y 60 pañales por paquete.',
      total: 15,
      prefix: 'diaper_g_',
    },
    {
      code: 'wipes',
      title: 'Toallitas Húmedas',
      description: 'Toallitas húmedas: Formato de cajas Multipack (x12 paquetes).',
      total: 12,
      prefix: 'diaper_wipes_',
    },
    {
      code: 'cream',
      title: 'Crema para coceduras',
      description: 'Crema o pasta para prevenir y calmar rozaduras del pañal.',
      total: 4,
      prefix: 'diaper_cream_',
    },
    {
      code: 'shampoo',
      title: 'Shampoo para bebé',
      description: 'Shampoo suave para el cabello y el cuero cabelludo del bebé.',
      total: 4,
      prefix: 'diaper_shampoo_',
    },
    {
      code: 'balsam',
      title: 'Bálsamo para bebé',
      description: 'Bálsamo hidratante para piel sensible o labios.',
      total: 4,
      prefix: 'diaper_balsam_',
    },
  ];

  // Helper to get diaper stats
  const getDiaperStats = (prefix: string, total: number) => {
    const matchingGifts = gifts.filter(g => g.id.startsWith(prefix));
    const reservedGifts = matchingGifts.filter(g => g.reservedBy);
    const reservedNames = reservedGifts.map(g => g.reservedBy).filter(Boolean) as string[];

    const nameCounts: { [name: string]: number } = {};
    reservedNames.forEach(name => {
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    });

    const formattedNames = Object.entries(nameCounts)
      .map(([name, count]) => `${name}${count > 1 ? ` (${count})` : ''}`)
      .join(', ');

    return {
      reservedCount: reservedGifts.length,
      percentage: Math.min(100, Math.round((reservedGifts.length / total) * 100)),
      formattedNames,
      firstAvailableGift: matchingGifts.find(g => !g.reservedBy) || null,
    };
  };

  const mapQuery = config?.locationAddress || config?.locationName || '';
  const mapEmbed = mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
    : null;

  return (
    <div>
      <a className="skip-link" href="#contenido">Ir al contenido</a>

      <header className="invite-nav">
        <span className="invite-mark">Baby Shower</span>
        <nav className="invite-nav-links" aria-label="Secciones">
          <a href="#evento">El día</a>
          <a href="#rsvp">Confirmar</a>
          <a href="#regalos">Regalos</a>
        </nav>
      </header>

      <section className="hero animate-fade-in">
        <SkyDecor />
        <div className="plane-scene">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bear-plane.png?v=2" alt="Osito aviador volando en un avioncito" />
        </div>
        <div className="hero-copy">
          <p className="hero-script">Un bebé está en camino</p>
          <p className="hero-welcome">Bienvenidos a</p>
          <h1>Baby Shower</h1>
          {timeLeft ? (
            <div className="countdown">
              {[
                { label: 'Días', val: timeLeft.days },
                { label: 'Horas', val: timeLeft.hours },
                { label: 'Minutos', val: timeLeft.minutes },
                { label: 'Segundos', val: timeLeft.seconds },
              ].map((item) => (
                <div key={item.label} className="countdown-pill">
                  <strong>{String(item.val).padStart(2, '0')}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ) : config?.date ? (
            <p className="date-pending">
              {new Date(config.date).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC',
              })}
              {config.time ? ` · ${config.time}` : ''}
            </p>
          ) : (
            <p className="date-pending">La fecha se confirmará muy pronto</p>
          )}
        </div>
      </section>

      <main id="contenido">
      {!loading && config && (config.date || config.time || config.locationName) && (
        <section id="evento" className="section container">
          <h2 className="section-title">El gran día</h2>
          <p className="section-lead">Los detalles de nuestra celebración</p>
          <div className="detail-grid">
            {(config.date || config.time) && (
              <article className="cloud-card detail-card">
                <div className="detail-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3>{config.date ? 'Fecha y hora' : 'Hora'}</h3>
                {config.date && (
                  <p>
                    {new Date(config.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                  </p>
                )}
                {config.time && <p style={{ color: 'var(--muted)' }}>{config.time}</p>}
              </article>
            )}

            {config.locationName && (
              <article className="cloud-card detail-card">
                <div className="detail-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <h3>Lugar</h3>
                <p>{config.locationName}</p>
                {config.locationAddress && <p style={{ color: 'var(--muted)' }}>{config.locationAddress}</p>}
                {config.locationNotes && <p className="venue-note">{config.locationNotes}</p>}
              </article>
            )}
          </div>
        </section>
      )}

      {!loading && config && (config.locationName || config.locationAddress) && (
        <section id="mapa" className="section container">
          <h2 className="section-title">Cómo llegar</h2>
          <p className="section-lead">
            Encuentra fácilmente el edificio. Sube a los quinchos de la azotea: en el ascensor, marca PM.
          </p>
          {mapEmbed && (
            <div className="map-frame">
              <iframe
                src={mapEmbed}
                title="Mapa del lugar del baby shower"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
          <div className="center-action">
            <a
              href={config.locationMapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Abrir en Google Maps
            </a>
          </div>
        </section>
      )}

      <section id="rsvp" className="section container">
        <h2 className="section-title">Confirma tu asistencia</h2>
        <p className="section-lead">Dinos si podrás acompañarnos en este día tan especial</p>
        <div className="cloud-card" style={{ maxWidth: '680px', margin: '0 auto' }}>

          <form onSubmit={handleRsvpSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input
                type="text"
                required
                placeholder="Ej. María López"
                className="form-control"
                value={rsvpName}
                onChange={e => setRsvpName(e.target.value)}
              />
            </div>

            <div className="grid-2" style={{ gap: '20px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Teléfono</label>
                <input
                  type="tel"
                  placeholder="Ej. +56 9 1234 5678"
                  className="form-control"
                  value={rsvpPhone}
                  onChange={e => setRsvpPhone(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="Ej. maria@correo.com"
                  className="form-control"
                  value={rsvpEmail}
                  onChange={e => setRsvpEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Acompañantes (Incluyéndote)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="form-control"
                  value={rsvpGuests}
                  onChange={e => setRsvpGuests(parseInt(e.target.value) || 1)}
                />
              </div>
              <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
                <label className="form-checkbox">
                  <input
                    type="radio"
                    name="attending"
                    checked={rsvpAttending === true}
                    onChange={() => setRsvpAttending(true)}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span>Sí asistiré</span>
                </label>
                <label className="form-checkbox">
                  <input
                    type="radio"
                    name="attending"
                    checked={rsvpAttending === false}
                    onChange={() => setRsvpAttending(false)}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span>No podré asistir</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mensaje para los padres (Opcional)</label>
              <textarea
                placeholder="Escribe un bonito deseo o nota aquí..."
                className="form-control"
                rows={3}
                value={rsvpMessage}
                onChange={e => setRsvpMessage(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>

            {rsvpStatus && (
              <div className="status-banner" data-type={rsvpStatus.type}>
                {rsvpStatus.message}
              </div>
            )}

            <div className="center-action">
              <button type="submit" disabled={submittingRsvp} className="btn btn-primary">
                {submittingRsvp ? 'Registrando...' : 'Enviar confirmación'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section id="regalos" className="section container">
        <h2 className="section-title">Mesa de regalos</h2>
        <p className="section-lead">
          Tu presencia es el mejor regalo. Si quieres un detalle, aquí hay ideas y un control de pañales para organizarnos.
        </p>

        <div className="chapter-tabs">
          <button
            type="button"
            onClick={() => setActiveGiftTab('surprise')}
            className="chapter-tab"
            data-active={activeGiftTab === 'surprise'}
          >
            Regalo sorpresa
          </button>
          <button
            type="button"
            onClick={() => setActiveGiftTab('diapers')}
            className="chapter-tab"
            data-active={activeGiftTab === 'diapers'}
          >
            Pañales y cuidado
          </button>
          <button
            type="button"
            onClick={() => setActiveGiftTab('catalog')}
            className="chapter-tab"
            data-active={activeGiftTab === 'catalog'}
          >
            Ideas de regalos
          </button>
          <button
            type="button"
            onClick={() => setActiveGiftTab('have')}
            className="chapter-tab"
            data-active={activeGiftTab === 'have'}
          >
            Ya tenemos
          </button>
        </div>

        {activeGiftTab === 'have' && (
        <div id="ya-tenemos" className="gift-block cloud-card have-list">
            <h3>Ya tenemos</h3>
            <p>Para no repetir, estas cosas ya están en casa:</p>
            <ul>
              <li>Coche</li>
              <li>Silla huevito</li>
              <li>Silla de auto</li>
              <li>Gimnasio para bebé</li>
              <li>Cunas</li>
              <li>Almohada de colecho</li>
              <li>Silla de comida</li>
              <li>Monitor</li>
              <li>Ropita de 0 a 3 meses</li>
              <li>Set de bodys</li>
              <li>Ropita para salir / vestir</li>
              <li>Medias, gorritos y mitones</li>
              <li>Mochila pañalera</li>
              <li>Cepillos de mamadera</li>
              <li>Extractor de leche</li>
              <li>Calentador de mamadera</li>
              <li>Máquina de ruido blanco</li>
            </ul>
        </div>
        )}

        {activeGiftTab === 'surprise' && (
        <div id="sorpresa" className="gift-block cloud-card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', color: 'var(--blue-deep)' }}>Regalo sorpresa</h3>
            <p style={{ color: 'var(--muted)', maxWidth: '58ch', margin: '0 auto 20px' }}>
              Las listas son solo ideas. Si tienes otro detalle en mente, regístralo para que no se repita. Algunas inspiraciones:
            </p>
            <figure className="surprise-ideas">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/surprise-gift-ideas.png?v=2"
                alt="Ejemplos de regalo sorpresa: sábanas, baberos, espejo para auto, cambiador, peluche, sweater, conjunto de invierno, zapatitos, sonajeros y set para comida"
              />
              <figcaption>
                Sábanas, baberos, espejo para el auto, cambiador portátil, peluche, sweater, conjuntos de invierno talla 9 meses, zapatitos, sonajeros y set para comida.
              </figcaption>
            </figure>
            <button
              type="button"
              onClick={() => setSurpriseModalOpen(true)}
              className="btn btn-primary"
            >
              Registrar regalo sorpresa
            </button>
        </div>
        )}

        {activeGiftTab === 'diapers' && (
        <div id="panales" className="gift-block cloud-card">
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Pañales y cuidado</h3>
              <p style={{ color: 'var(--muted)', maxWidth: '55ch', margin: '0 auto' }}>
                Buscamos formatos grandes (Hiperpack / Mega) y también cremas, shampoo y bálsamo. Elige un ítem para completar la meta.
              </p>
            </div>

            <div className="diaper-contacts">
              <p className="diaper-contacts-lead">
                Como queremos que ahorres en tu regalo, te dejamos estos contactos que venden pañales baratos:
              </p>
              <ul>
                <li>
                  <strong>TuPanalExpress</strong>
                  <a href="tel:+56933068865">+56 9 3306 8865</a>
                </li>
                <li>
                  <strong>BabyFelizPanales</strong>
                  <a href="tel:+56977778951">+56 9 7777 8951</a>
                </li>
                <li>
                  <strong>StarBaby.cl</strong>
                  <a href="tel:+56928439005">+56 9 2843 9005</a>
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {diaperData.map(diaper => {
                const stats = getDiaperStats(diaper.prefix, diaper.total);
                const isCompleted = stats.reservedCount >= diaper.total;
                
                return (
                  <div key={diaper.code} className="diaper-row" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>{diaper.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{diaper.description}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                          {stats.reservedCount} de {diaper.total} paquetes
                        </span>
                      </div>
                    </div>

                    <div className="cloud-bar" aria-hidden="true">
                      <span style={{ width: `${stats.percentage}%` }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '4px' }}>
                      <div style={{ flex: '1', minWidth: '200px' }}>
                        {stats.formattedNames ? (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ❤️ Reservado por: <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{stats.formattedNames}</span>
                          </p>
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Aún no hay reservas para esta talla.
                          </p>
                        )}
                      </div>
                      <div>
                        {isCompleted ? (
                          <span className="done-pill">Completado</span>
                        ) : (
                          <button
                            onClick={() => {
                              if (stats.firstAvailableGift) {
                                setReservingGift(stats.firstAvailableGift);
                              }
                            }}
                            className="btn btn-primary"
                            style={{ padding: '8px 18px', fontSize: '0.8rem' }}
                          >
                            Regalar Paquete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
        )}

        {activeGiftTab === 'catalog' && (
        <div id="ideas" className="gift-block">
            {/* Search & Filters */}
            <div className="cloud-card" style={{ padding: '20px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                
                {/* Search Input */}
                <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Buscar regalo..."
                    className="form-control"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                  />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>

                {/* Status Filter */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'available', label: 'Disponibles' },
                    { id: 'reserved', label: 'Reservados' },
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => setStatusFilter(btn.id as any)}
                      className={`btn ${statusFilter === btn.id ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '20px' }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Tabs */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '16px', paddingBottom: '4px' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: 'none',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      backgroundColor: selectedCategory === cat ? 'var(--color-primary-light)' : 'rgba(58, 109, 134, 0.06)',
                      color: selectedCategory === cat ? 'var(--color-primary-dark)' : 'var(--text-muted)',
                      fontWeight: selectedCategory === cat ? 600 : 400,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Gift Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="loader" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--text-muted)' }}>Cargando catálogo...</p>
              </div>
            ) : filteredGifts.length === 0 ? (
              <div className="cloud-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-primary-dark)', marginBottom: '16px', opacity: 0.6 }}>
                  <path d="M20 12v10H4V12m16-4v4H4V8m16 0a2 2 0 0 0-2-2h-3.382a2 2 0 0 0-3.236 0H5a2 2 0 0 0-2 2m17 0H3m9 14V8M12 4c-1.333 0-4 1-4 4h8c0-3-2.667-4-4-4z" />
                </svg>
                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No encontramos regalos con los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="gift-grid">
                {filteredGifts.map(gift => (
                  <div
                    key={gift.id}
                    className={`cloud-card gift-card${gift.reservedBy ? ' is-reserved' : ''}`}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  >
                    <div>
                      <GiftIdeaArt id={gift.id} category={gift.category} />
                      <span className="gift-tag">{gift.category}</span>
                      <h3>{gift.name}</h3>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                      {gift.reservedBy ? (
                        <div className="reserved-note">
                          <span>Reservado por {gift.reservedBy}</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setReservingGift(gift)}
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '10px 16px', fontSize: '0.85rem' }}
                        >
                          Regalar este
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
        )}

        {/* 4. Manage/Change Gift Section (Auto-servicio de liberación) */}
        <div className="manage-row">
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
            ¿Ya reservaste y quieres cambiar o liberar tu selección?
          </p>
          <button
            type="button"
            onClick={() => {
              setManageModalOpen(true);
              setLookupName('');
              setMyReservations([]);
              setLookupPerformed(false);
              setReleaseStatus(null);
            }}
            className="btn btn-secondary"
          >
            Gestionar mis reservas
          </button>
        </div>
      </section>
      </main>

      {/* Reservation Modal */}
      {reservingGift && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              onClick={() => { setReservingGift(null); setReserveStatus(null); setReserveGuestName(''); }}
              style={{ 
                position: 'absolute', 
                right: '20px', 
                top: '20px', 
                border: 'none', 
                background: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              &times;
            </button>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)' }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              Reservar Regalo
            </h3>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
              Vas a reservar el regalo: <strong style={{ color: 'var(--text-main)' }}>{reservingGift.name}</strong>. Quedará bloqueado para que otros invitados no elijan el mismo.
            </p>

            <form onSubmit={handleReserveSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Tu Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  className="form-control"
                  value={reserveGuestName}
                  onChange={e => setReserveGuestName(e.target.value)}
                  disabled={submittingReservation}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Tu Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="Ej. juan.perez@email.com"
                  className="form-control"
                  value={reserveGuestEmail}
                  onChange={e => setReserveGuestEmail(e.target.value)}
                  disabled={submittingReservation}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Te enviaremos un correo de confirmación y un recordatorio 2 semanas antes del evento.
                </span>
              </div>

              {reserveStatus && (
                <div className="status-banner" data-type={reserveStatus.type}>
                  {reserveStatus.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => { setReservingGift(null); setReserveStatus(null); setReserveGuestName(''); setReserveGuestEmail(''); }}
                  className="btn btn-secondary"
                  disabled={submittingReservation}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submittingReservation || !reserveGuestName.trim() || !reserveGuestEmail.trim()}
                >
                  {submittingReservation ? 'Reservando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Surprise Gift Modal */}
      {surpriseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              onClick={() => { setSurpriseModalOpen(false); setSurpriseStatus(null); setSurpriseGiftName(''); setSurpriseGuestName(''); setSurpriseGuestEmail(''); }}
              style={{ 
                position: 'absolute', 
                right: '20px', 
                top: '20px', 
                border: 'none', 
                background: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              &times;
            </button>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              🎁 Registrar Regalo Sorpresa
            </h3>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
              Dinos tu nombre y el regalo sorpresa que deseas traer. No es necesario que te cases con los de la lista; las sugerencias son solo ideas para guiarte.
            </p>

            <form onSubmit={handleSurpriseSubmit}>
              <div className="form-group">
                <label className="form-label">Tu Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  className="form-control"
                  value={surpriseGuestName}
                  onChange={e => setSurpriseGuestName(e.target.value)}
                  disabled={submittingSurprise}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tu Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="Ej. juan.perez@email.com"
                  className="form-control"
                  value={surpriseGuestEmail}
                  onChange={e => setSurpriseGuestEmail(e.target.value)}
                  disabled={submittingSurprise}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">¿Qué regalo sorpresa tienes en mente?</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ropa tejida a mano / Es sorpresa 🤫"
                  className="form-control"
                  value={surpriseGiftName}
                  onChange={e => setSurpriseGiftName(e.target.value)}
                  disabled={submittingSurprise}
                />
              </div>

              {surpriseStatus && (
                <div className="status-banner" data-type={surpriseStatus.type}>
                  {surpriseStatus.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => { setSurpriseModalOpen(false); setSurpriseStatus(null); setSurpriseGiftName(''); setSurpriseGuestName(''); setSurpriseGuestEmail(''); }}
                  className="btn btn-secondary"
                  disabled={submittingSurprise}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submittingSurprise || !surpriseGuestName.trim() || !surpriseGiftName.trim() || !surpriseGuestEmail.trim()}
                >
                  {submittingSurprise ? 'Registrando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Reservations Modal */}
      {manageModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <button 
              onClick={() => { setManageModalOpen(false); setLookupName(''); setMyReservations([]); setLookupPerformed(false); setReleaseStatus(null); }}
              style={{ 
                position: 'absolute', 
                right: '20px', 
                top: '20px', 
                border: 'none', 
                background: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              &times;
            </button>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              🛠️ Gestionar mis Reservas
            </h3>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Escribe el nombre con el que hiciste la reserva para listar tus regalos y poder liberarlos si deseas cambiar tu selección.
            </p>

            <form onSubmit={handleLookupReservations} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <input
                type="text"
                required
                placeholder="Nombre exacto con el que reservaste"
                className="form-control"
                value={lookupName}
                onChange={e => setLookupName(e.target.value)}
                disabled={lookupLoading}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={lookupLoading || !lookupName.trim()} style={{ padding: '0 20px', height: '46px' }}>
                {lookupLoading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            {releaseStatus && (
              <div className="status-banner" data-type={releaseStatus.type}>
                {releaseStatus.message}
              </div>
            )}

            {lookupPerformed && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  Regalos reservados por "{lookupName}"
                </h4>
                {myReservations.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '10px 0' }}>
                    No encontramos ningún regalo ni paquete de pañales reservado bajo este nombre. Asegúrate de escribirlo exactamente igual.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                    {myReservations.map(gift => (
                      <div key={gift.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '12px 16px', 
                        borderRadius: '12px', 
                        background: 'rgba(114, 99, 98, 0.05)',
                        border: '1px solid rgba(114, 99, 98, 0.1)'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{gift.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Categoría: {gift.category}</div>
                        </div>
                        <button 
                          onClick={() => handleReleaseReservation(gift.id, gift.name)}
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger-color)', borderColor: 'rgba(214, 40, 40, 0.3)' }}
                        >
                          Liberar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      <footer className="invite-footer">
        <p>Con cariño, los esperamos</p>
      </footer>
    </div>
  );
}
