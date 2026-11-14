import type { INestApplication } from '@nestjs/common';
import { json } from 'express';

export function registerBodyParsers(app: Pick<INestApplication, 'use'>) {
  app.use('/api/network', json({ limit: '1mb' }));
  // Nest detects jsonParser by name, even when it is mounted on only one path.
  // Register the default parser explicitly so other routes still receive JSON.
  app.use(json());
}
