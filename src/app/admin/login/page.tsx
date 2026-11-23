import { headers } from 'next/headers';
import LoginForm from '@/components/LoginForm';
import { detectLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const headersList = await headers();
  const locale = detectLocale(headersList.get('accept-language'));

  return <LoginForm locale={locale} />;
}
