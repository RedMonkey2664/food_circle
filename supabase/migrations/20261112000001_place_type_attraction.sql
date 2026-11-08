-- India expansion (2026-11-08, human decision): tourist attractions (forts, beaches, museums,
-- temples...) become places you can log a verdict on. Own migration: a new enum value must be
-- committed before it is used.
alter type public.place_type add value if not exists 'attraction';
