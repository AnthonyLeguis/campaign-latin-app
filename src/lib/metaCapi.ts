type MetaCapiEventPayload = {
  eventName?: string;
  eventId?: string;
  customData?: Record<string, unknown>;
  actionSource?: 'website' | string;
};

const endpoint = import.meta.env.PROD 
  ? 'https://campaign-latin-app.onrender.com/meta-capi/event'
  : '/meta-capi/event';

export async function sendMetaCapiEvent({
  eventName = 'PageView',
  eventId,
  customData,
  actionSource = 'website',
}: MetaCapiEventPayload = {}) {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return;
  }

  const payload = {
    event_name: eventName,
    event_id: eventId ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined),
    custom_data: customData,
    action_source: actionSource,
  };

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    console.warn('[meta-capi] Error al enviar evento:', error);
  }
}
