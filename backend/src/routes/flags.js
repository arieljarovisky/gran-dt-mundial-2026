import { Router } from 'express';
import { getFlagCdnUrl } from '../utils/flagUrls.js';

const router = Router();

router.get('/:code', async (req, res, next) => {
  try {
    const url = getFlagCdnUrl(req.params.code);
    if (!url) {
      return res.status(404).json({ error: 'Bandera no encontrada.' });
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'GranDT/1.0' },
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'No se pudo obtener la bandera.' });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
