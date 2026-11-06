# Seed data to check

`supabase/seed.sql` has placeholder data that needs a human with a map.

## Coordinates (all of them)

Every building is currently at `lat 0, lng 0`. Before the map ships (phase 3), fill in real values, e.g. right-click the building's main entrance in Google Maps or OpenStreetMap and copy the coordinates.

| Code | Building | lat | lng |
|---|---|---|---|
| LWSN | Lawson Computer Science Building | TODO | TODO |
| HAAS | Haas Hall | TODO | TODO |
| WALC | Wilmeth Active Learning Center | TODO | TODO |
| PMU | Purdue Memorial Union | TODO | TODO |
| ARMS | Neil Armstrong Hall of Engineering | TODO | TODO |
| WTHR | Wetherill Laboratory of Chemistry | TODO | TODO |
| PHYS | Physics Building | TODO | TODO |
| MATH | Mathematical Sciences Building | TODO | TODO |
| BRNG | Beering Hall | TODO | TODO |
| STEW | Stewart Center | TODO | TODO |
| HIKS | Hicks Undergraduate Library | TODO | TODO |
| CREC | France A. Córdova Recreational Sports Center | TODO | TODO |
| ERHT | Earhart Dining Court | TODO | TODO |
| FORD | Ford Dining Court | TODO | TODO |
| HILL | Hillenbrand Dining Court | TODO | TODO |
| WILY | Wiley Dining Court | TODO | TODO |
| WIND | Windsor Dining Court | TODO | TODO |

## Building codes to confirm

Check these against Purdue's official building abbreviations:

- **CREC** for the CoRec. Not sure this is the official code.
- **ERHT, FORD, HILL, WILY, WIND** for the dining courts. These follow the residence hall codes, but the dining courts may use different codes.

Changing a code later is easy now (no real fountains yet) and painful after launch, because codes are part of fountain URLs and QR stickers.

## Other

- `/about` needs a real contact address or link (see the TODO in `app/about/page.tsx`).
