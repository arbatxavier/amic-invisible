import { headers } from 'next/headers';
import AdminPanel from '@/components/AdminPanel';
import { detectLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const headersList = await headers();
  const locale = detectLocale(headersList.get('accept-language'));

  return <AdminPanel locale={locale} />;
}
