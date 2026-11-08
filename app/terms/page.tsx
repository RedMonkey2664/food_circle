import { LegalPage } from '@/components/ui/LegalPage';
import { copy } from '@/lib/copy';

export const metadata = { title: copy.legal.termsTitle };

export default function TermsPage() {
  return <LegalPage title={copy.legal.termsTitle} sections={copy.legal.terms} />;
}
