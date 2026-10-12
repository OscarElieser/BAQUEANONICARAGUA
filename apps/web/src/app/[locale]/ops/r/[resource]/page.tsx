'use client';

import { use } from 'react';
import { ResourceManager } from '@/ops/ResourceManager';
import { resourceByKey } from '@/ops/resources';

export default function ResourcePage({ params }: { params: Promise<{ locale: string; resource: string }> }) {
  const { locale, resource } = use(params);
  const def = resourceByKey(resource);
  if (!def) return <p role="alert">Este recurso no se administra desde el Ops Center.</p>;
  return <ResourceManager resource={def} locale={locale} />;
}
