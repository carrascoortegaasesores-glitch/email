// pages/api/db.js
// Lee y escribe datos compartidos en Upstash Redis.
// Todos los dispositivos comparten los mismos datos en tiempo real.

export default async function handler(req, res) {
  const url   = process.env.STORAGE_URL;
  const token = process.env.STORAGE_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: 'Base de datos no configurada. Revisa las variables de entorno en Vercel.' });
  }

  const redisUrl = url.startsWith('rediss://') || url.startsWith('redis://')
    ? url.replace('redis://', 'https://').replace('rediss://', 'https://')
    : url;

  const baseUrl = redisUrl.replace(/\/$/, '');

  try {
    if (req.method === 'GET') {
      const { key } = req.query;
      if (!key) return res.status(400).json({ error: 'Falta el parámetro key' });

      const response = await fetch(`${baseUrl}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      return res.status(200).json({ value: data.result });

    } else if (req.method === 'POST') {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'Falta el parámetro key' });

      const response = await fetch(`${baseUrl}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });
      const data = await response.json();
      return res.status(200).json({ ok: data.result === 'OK' });

    } else {
      return res.status(405).json({ error: 'Método no permitido' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error de base de datos: ' + error.message });
  }
}
