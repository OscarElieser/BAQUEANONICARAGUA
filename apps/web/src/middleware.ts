import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales } from '@/i18n/config';

// Detección inicial del idioma: cookie de preferencia → Accept-Language → español.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;

  const cookie = req.cookies.get('locale')?.value;
  const header = req.headers.get('accept-language') ?? '';
  const fromHeader = header
    .split(',')
    .map((p) => p.split(';')[0].trim())
    .map((tag) => (tag.toLowerCase().startsWith('zh') ? 'zh-Hans' : tag.slice(0, 2)))
    .find((tag) => (locales as readonly string[]).includes(tag));
  const locale = (cookie && (locales as readonly string[]).includes(cookie) ? cookie : fromHeader) ?? defaultLocale;

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
