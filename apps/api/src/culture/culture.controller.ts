import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../auth/firebase-auth.guard';
import { SupabaseService } from '../common/supabase.service';
import { httpFromDb, ZodPipe } from '../common/zod.pipe';

const slug = z.string().regex(/^[a-z0-9-]{1,120}$/);
const timelineSchema = z.object({
  department: z.coerce.number().int().min(1).max(17).optional(),
  era: z.enum(['prehispanic', 'colonial', 'republican', 'contemporary']).optional(),
});

/** Biblioteca cultural, histórica y musical (solo contenido publicado). */
@ApiTags('cultura')
@Public()
@Controller('culture')
export class CultureController {
  constructor(private readonly db: SupabaseService) {}

  @Get('timeline')
  async timeline(@Query(new ZodPipe(timelineSchema)) q: z.infer<typeof timelineSchema>) {
    const { data, error } = await this.db.anon.rpc('history_timeline', { p_department: q.department ?? null, p_era: q.era ?? null });
    if (error) httpFromDb(error);
    return data;
  }

  @Get('heritage')
  async heritage(@Query('department') department?: string) {
    let query = this.db.anon.from('heritage_items').select('id, slug, title, kind, tangible, department_id, summary, unesco_recognized').order('title');
    const d = Number(department);
    if (Number.isInteger(d) && d >= 1 && d <= 17) query = query.eq('department_id', d);
    const { data, error } = await query;
    if (error) httpFromDb(error);
    return data;
  }

  @Get('heritage/:slug')
  async heritageItem(@Param('slug', new ZodPipe(slug)) s: string) {
    const { data, error } = await this.db.anon.from('heritage_items').select('*').eq('slug', s).maybeSingle();
    if (error) httpFromDb(error);
    if (!data) throw new NotFoundException('Elemento no encontrado o aún no publicado');
    return data;
  }

  @Get('artists')
  async artists() {
    const { data, error } = await this.db.anon.from('artists').select('id, slug, name, kind, genres, department_id').order('name');
    if (error) httpFromDb(error);
    return data;
  }

  @Get('artists/:slug')
  async artist(@Param('slug', new ZodPipe(slug)) s: string) {
    const { data, error } = await this.db.anon
      .from('artists')
      .select('id, slug, name, kind, genres, instruments, department_id, bio_md, artist_contacts(kind, value), music_works(id, title, year, genre, embed_url)')
      .eq('slug', s)
      .maybeSingle();
    if (error) httpFromDb(error);
    if (!data) throw new NotFoundException('Artista no encontrado o aún no publicado');
    return data;
  }
}
