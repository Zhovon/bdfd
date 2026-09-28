-- Sample content for demoing how populated pages look.
-- Run against the app database (schema must already exist — visit the site once first):
--   psql "$DATABASE_URL" -f scripts/sample-seed.sql
-- Images use picsum.photos placeholders so no uploads are needed. Safe to delete
-- these posts from Admin → Content afterwards.

DO $$
DECLARE pid INT;
BEGIN
  -- Tour 1 — participation fee, gallery + video + itinerary sections
  INSERT INTO posts (category, title, body, excerpt, payment_mode, fee_amount, image_url)
  VALUES ('travel', 'Cox''s Bazar Beach Tour — 3 Days', '',
    'A guided three-day departmental tour to the world''s longest natural sea beach. Families welcome; the fee covers transport, lodging and meals.',
    'participation', 4500, 'https://picsum.photos/seed/coxbazar1/1200/675')
  RETURNING id INTO pid;
  INSERT INTO post_images (post_id, url, sort_order, block_id) VALUES
    (pid, 'https://picsum.photos/seed/coxbazar1/1200/675', 0, NULL),
    (pid, 'https://picsum.photos/seed/coxbazar2/1200/675', 1, NULL),
    (pid, 'https://picsum.photos/seed/coxbazar3/1200/675', 2, NULL);
  INSERT INTO post_videos (post_id, url, sort_order) VALUES
    (pid, 'https://www.youtube.com/watch?v=ScMzIvxBSi4', 0);
  INSERT INTO post_blocks (post_id, heading, body, sort_order) VALUES
    (pid, 'Day 1 — Departure & Laboni Beach', 'Overnight coach from Dhaka, check-in near Laboni Point, and an evening at the beach.', 0),
    (pid, 'Day 2 — Inani & Himchari', 'A full day exploring Inani''s coral rocks and the Himchari waterfall and viewpoints.', 1),
    (pid, 'Day 3 — Local market & return', 'Morning at the burmese market for souvenirs, then the return journey.', 2);

  -- Tour 2 — participation fee, gallery
  INSERT INTO posts (category, title, body, excerpt, payment_mode, fee_amount, image_url)
  VALUES ('travel', 'Sylhet Tea Gardens Retreat — 2 Days', '',
    'A restful weekend among the rolling tea estates of Sreemangal. Limited seats — reserve early.',
    'participation', 3200, 'https://picsum.photos/seed/sylhet1/1200/675')
  RETURNING id INTO pid;
  INSERT INTO post_images (post_id, url, sort_order, block_id) VALUES
    (pid, 'https://picsum.photos/seed/sylhet1/1200/675', 0, NULL),
    (pid, 'https://picsum.photos/seed/sylhet2/1200/675', 1, NULL);
  INSERT INTO post_blocks (post_id, heading, body, sort_order) VALUES
    (pid, 'Highlights', 'Tea-estate walks, the Lawachara rainforest, and the seven-layer tea in Sreemangal town.', 0);

  -- Association notice — informational, one image
  INSERT INTO posts (category, title, body, excerpt, image_url)
  VALUES ('association', 'Annual General Meeting 2026 — Notice', '',
    'All members are invited to the Annual General Meeting. The agenda, venue and voter list are attached below.',
    'https://picsum.photos/seed/agm/1200/675')
  RETURNING id INTO pid;
  INSERT INTO post_images (post_id, url, sort_order, block_id) VALUES
    (pid, 'https://picsum.photos/seed/agm/1200/675', 0, NULL);
  INSERT INTO post_blocks (post_id, heading, body, sort_order) VALUES
    (pid, 'Agenda', 'Annual report, accounts, committee election, and any other business with the chair''s permission.', 0);

  -- Welfare notice — informational (payments are tour-only now)
  INSERT INTO posts (category, title, body, excerpt, image_url)
  VALUES ('welfare', 'Get-well wishes for a colleague', '',
    'We send our warm wishes to a colleague recovering from surgery, and thank everyone who has offered support.',
    'https://picsum.photos/seed/welfare9/1200/675')
  RETURNING id INTO pid;
  INSERT INTO post_images (post_id, url, sort_order, block_id) VALUES
    (pid, 'https://picsum.photos/seed/welfare9/1200/675', 0, NULL);

  -- Condolence notice
  INSERT INTO posts (category, title, body, excerpt, image_url)
  VALUES ('condolence', 'In remembrance of a respected colleague', '',
    'We mourn the passing of a respected retired officer and extend our heartfelt condolences to the bereaved family.',
    'https://picsum.photos/seed/condolence3/1200/675')
  RETURNING id INTO pid;
  INSERT INTO post_images (post_id, url, sort_order, block_id) VALUES
    (pid, 'https://picsum.photos/seed/condolence3/1200/675', 0, NULL);
END $$;
