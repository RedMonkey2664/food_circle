import { notFound } from 'next/navigation';
import { DietBadges } from '@/components/place/DietBadges';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { RelationshipTag } from '@/components/verdict/RelationshipTag';
import { VerdictLabel } from '@/components/verdict/VerdictLabel';
import { VerdictPlayground } from './VerdictPlayground';

export const metadata = { title: 'Components (dev)' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// Dev-only gallery of the base components at phone width (P0-06).
export default function ComponentsPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto max-w-[480px] space-y-10 px-4 py-8">
      <h1 className="font-display text-2xl font-semibold">Components</h1>

      <Section title="VerdictButtons">
        <VerdictPlayground />
      </Section>

      <Section title="Verdict labels">
        <div className="flex flex-wrap gap-4">
          <VerdictLabel verdict="go" />
          <VerdictLabel verdict="skip" />
          <VerdictLabel verdict="only_for" onlyForText="the misal" />
        </div>
      </Section>

      <Section title="RelationshipTag">
        <div className="flex flex-wrap items-center gap-3">
          <RelationshipTag tier="friend" />
          <RelationshipTag tier="friend" group="Family" />
          <RelationshipTag tier="following" />
          <RelationshipTag tier="public" />
        </div>
      </Section>

      <Section title="Cards by trust tier">
        <Card tone="friend">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Rahul</span>
            <RelationshipTag tier="friend" group="Family" />
            <span className="text-muted ml-auto text-sm">2d</span>
          </div>
          <p className="mt-1 font-medium">Britannia &amp; Co., Ballard Estate</p>
          <p className="mt-1 flex items-center gap-2">
            <VerdictLabel verdict="go" /> <span className="text-muted">Berry pulao</span>
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Meera</span>
            <RelationshipTag tier="following" />
            <span className="text-muted ml-auto text-sm">5d</span>
          </div>
          <p className="mt-1 font-medium">Kyani &amp; Co., Marine Lines</p>
          <p className="mt-1 flex items-center gap-2">
            <VerdictLabel verdict="skip" /> <span className="text-muted">too oily</span>
          </p>
        </Card>
        <Card tone="public">
          <div className="flex items-center gap-2">
            <span className="font-medium">sameer.eats</span>
            <RelationshipTag tier="public" />
            <span className="text-muted ml-auto">1w</span>
          </div>
          <p className="mt-0.5">
            <VerdictLabel verdict="only_for" onlyForText="the bun maska" />
          </p>
        </Card>
      </Section>

      <Section title="DietBadges">
        <DietBadges flags={['pure_veg', 'jain']} />
        <DietBadges flags={['veg_options', 'halal', 'egg']} />
        <DietBadges flags={[]} />
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>I ate here</Button>
          <Button variant="secondary">Find on Swiggy</Button>
          <Button variant="ghost">Show 12 more</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          title="Add friends to see who you trust here"
          body="Your friends' verdicts show up first on every place."
          action={<Button>Invite friends on WhatsApp</Button>}
        />
      </Section>
    </main>
  );
}
