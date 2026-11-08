import { LegalPage } from '@/components/ui/LegalPage';
import { copy } from '@/lib/copy';

export const metadata = { title: copy.legal.privacyTitle };

export default function PrivacyPage() {
  return <LegalPage title={copy.legal.privacyTitle} sections={copy.legal.privacy} />;
}
