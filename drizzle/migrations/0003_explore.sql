ALTER TABLE "providers" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;

ALTER TABLE "providers" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(display_name, '') || ' ' ||
      coalesce(bio, '') || ' ' ||
      coalesce(location, '')
    )
  ) STORED;

CREATE INDEX providers_search_idx ON providers USING GIN (search_vector);
