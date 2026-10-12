import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../auth/firebase-auth.guard';
import { SupabaseService } from '../common/supabase.service';
import { httpFromDb, ZodPipe } from '../common/zod.pipe';

const searchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  department: z.coerce.number().int().min(1).max(17).optional(),
  category: z.string().regex(/^[a-z0-9-]{2,40}$/).optional(),
  kind: z.enum(['destination', 'business']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  offset: z.coerce.number().int().min(0).max(1000).default(0),
});

const nearbySchema = z.object({
  lat: z.coerce.number().min(10.5).max(15.2),     // caja aproximada de Nicaragua
  lng: z.coerce.number().min(-88).max(-82.5),
  radius_km: z.coerce.number().min(0.5).max(100).default(10),
});

const slugSchema = z.string().regex(/^[a-z0-9-]{1,120}$/);

/** Catálogo público: todo pasa por RLS como visitante (solo contenido publicado). */
@ApiTags('catálogo')
@Public()
@Controller()
export class CatalogController {
  constructor(private readonly db: SupabaseService) {}

  @Get('catalog/search')
  async search(@Query(new ZodPipe(searchSchema)) q: z.infer<typeof searchSchema>) {
    const { data, error } = await this.db.anon.rpc('search_catalog', {
      q: q.q ?? null,
      p_department: q.department ?? null,
      p_category: q.category ?? null,
      p_kind: q.kind ?? null,
      p_limit: q.limit,
      p_offset: q.offset,
    });
    if (error) httpFromDb(error);
    return { results: data, ordering: 'relevancia; a igual relevancia, rotación diaria. Sin patrocinados.' };
  }

  @Get('catalog/nearby')
  async nearby(@Query(new ZodPipe(nearbySchema)) q: z.infer<typeof nearbySchema>) {
    const { data, error } = await this.db.anon.rpc('nearby_catalog', {
      p_lat: q.lat, p_lng: q.lng, p_radius_km: q.radius_km, p_limit: 30,
    });
    if (error) httpFromDb(error);
    return { results: data };
  }

  @Get('territories')
  async territories() {
    const { data, error } = await this.db.anon.from('departments').select('id, slug, name, kind').order('name');
    if (error) httpFromDb(error);
    return data;
  }

  @Get('territories/:slug')
  async territory(@Param('slug', new ZodPipe(slugSchema)) slug: string, @Query('locale') locale = 'es') {
    const { data: t, error } = await this.db.anon
      .from('departments')
      .select('id, slug, name, kind, capital_name, municipalities(id, slug, name)')
      .eq('slug', slug)
      .maybeSingle();
    if (error) httpFromDb(error);
    if (!t) throw new NotFoundException('Territorio no encontrado o aún no publicado');
    const { data: sections } = await this.db.anon
      .from('territory_sections')
      .select('section, title, body_md, machine_translated, verified_at')
      .eq('department_id', t.id)
      .eq('locale', locale);
    return { ...t, sections: sections ?? [] };
  }

  @Get('destinations/:slug')
  async destination(@Param('slug', new ZodPipe(slugSchema)) slug: string) {
    const { data, error } = await this.db.anon.from('public_destinations').select('*').eq('slug', slug).maybeSingle();
    if (error) httpFromDb(error);
    if (!data) throw new NotFoundException('Destino no encontrado o aún no publicado');
    const [hours, prices] = await Promise.all([
      this.db.anon.from('opening_hours').select('weekday, opens_at, closes_at, closed, verified_at').eq('destination_id', data.id),
      this.db.anon.from('price_observations').select('label, amount, currency, unit, observed_at, reported_by').eq('destination_id', data.id),
    ]);
    return { ...data, opening_hours: hours.data ?? [], prices: prices.data ?? [] };
  }

  @Get('businesses/:slug')
  async business(@Param('slug', new ZodPipe(slugSchema)) slug: string) {
    const { data, error } = await this.db.anon.from('public_businesses').select('*').eq('slug', slug).maybeSingle();
    if (error) httpFromDb(error);
    if (!data) throw new NotFoundException('Negocio no encontrado o aún no publicado');
    const [contacts, hours, prices] = await Promise.all([
      this.db.anon.from('contacts').select('kind, value').eq('business_id', data.id),
      this.db.anon.from('opening_hours').select('weekday, opens_at, closes_at, closed, verified_at').eq('business_id', data.id),
      this.db.anon.from('price_observations').select('label, amount, currency, unit, observed_at, reported_by').eq('business_id', data.id),
    ]);
    return { ...data, contacts: contacts.data ?? [], opening_hours: hours.data ?? [], prices: prices.data ?? [] };
  }
}
