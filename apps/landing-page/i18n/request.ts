import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // locale is guaranteed to be one of routing.locales after hasLocale check
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  let messages;
  try {
    messages = (await import(`../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../messages/${routing.defaultLocale}.json`)).default;
  }

  return { locale, messages };
});
