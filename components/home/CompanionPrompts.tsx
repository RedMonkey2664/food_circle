import { ActionButton } from '@/components/social/ActionButton';
import { respondCompanion } from '@/lib/actions/places';
import { copy } from '@/lib/copy';
import { myCompanionTags } from '@/lib/data/diary';

/**
 * P5-08: "Asha tagged you at Kyani. Add to your log?" Adding opens the log sheet for that
 * place and date; the tag itself never gives points.
 */
export async function CompanionPrompts() {
  const tags = await myCompanionTags();
  if (tags.length === 0) return null;
  const t = copy.companions;
  return (
    <ul className="mt-3 space-y-2">
      {tags.map((tag) => (
        <li
          key={tag.visitId}
          className="border-primary/30 bg-primary-soft flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border p-3"
        >
          <p className="text-sm">{t.tagged(tag.byName, tag.placeName)}</p>
          <div className="flex gap-2">
            <ActionButton
              action={respondCompanion}
              fields={{ visitId: tag.visitId, add: '0' }}
              label={t.dismiss}
              variant="ghost"
            />
            <ActionButton
              action={respondCompanion}
              fields={{ visitId: tag.visitId, placeId: tag.placeId, date: tag.visitedOn, add: '1' }}
              label={t.add}
              variant="primary"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
