# Seed data to check

`supabase/seed.sql` has placeholder data that needs a human with a map.

## Coordinates

All buildings except **PMU** now have coordinates, taken from building centers in OpenStreetMap (Nov 2026). Still to do:

- **PMU** (Purdue Memorial Union) is still `0, 0`, so it's hidden from the map. Fill it in from a map.
- **ERHT, HILL, WIND** point at the center of Earhart Hall, Hillenbrand Hall and Windsor Halls (the dining courts are inside them). Move them to the dining court entrance if you prefer.
- Spot-check the rest on the map view (`/?view=map`).

## Building codes to confirm

Check these against Purdue's official building abbreviations:

- **CREC** for the CoRec. Not sure this is the official code.
- **ERHT, FORD, HILL, WILY, WIND** for the dining courts. (OpenStreetMap tags Wiley Dining Court as **WDCT**.) These follow the residence hall codes, but the dining courts may use different codes.

Changing a code later is easy now (no real fountains yet) and painful after launch, because codes are part of fountain URLs and QR stickers.

## Other

- `/about` needs a real contact address or link (see the TODO in `app/about/page.tsx`).
