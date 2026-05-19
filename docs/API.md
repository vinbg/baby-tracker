# API reference

All `/api/*` routes except `/api/login` require `Authorization: Bearer <AUTH_TOKEN>`.

## Auth

### `POST /api/login`

Body:

```json
{ "username": "veli", "password": "..." }
```

Returns:

```json
{ "token": "...", "user": "veli" }
```

## Baby profile

### `GET /api/baby`

Returns `{ "name": "Baby", "birthDate": "2026-01-30" }`.

## Feedings

- `GET /api/feedings?day=YYYY-MM-DD`
- `POST /api/feedings`
- `PATCH /api/feedings/:id`
- `DELETE /api/feedings/:id`
- `GET /api/feedings/recent-days?limit=120`

Create body:

```json
{
  "day": "2026-05-19",
  "fedAt": "2026-05-19T07:30:00.000Z",
  "amountMl": 135,
  "durationMin": 20,
  "note": "optional"
}
```

## Sleep

### `GET /api/sleeps?day=YYYY-MM-DD`

Returns sleep sessions for the selected day.

### `POST /api/sleeps`

Creates a completed sleep entry.

```json
{
  "day": "2026-05-19",
  "startAt": "2026-05-19T10:30:00.000Z",
  "endAt": "2026-05-19T11:15:00.000Z",
  "note": "optional"
}
```

### `PATCH /api/sleeps/:id`

Updates `day`, `startAt`, `endAt`, or `note`.

### `DELETE /api/sleeps/:id`

Deletes a sleep session.

## Diapers

- `GET /api/diapers?day=YYYY-MM-DD`
- `POST /api/diapers`
- `PATCH /api/diapers/:id`
- `DELETE /api/diapers/:id`

Create body:

```json
{ "day": "2026-05-19", "kind": "wet", "loggedAt": "2026-05-19T10:30:00.000Z" }
```

## Notes

- `GET /api/notes/:day`
- `PUT /api/notes/:day`

## Settings and recommendations

- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/recommendations?day=YYYY-MM-DD`

## Trends

### `GET /api/trends?days=14`

Returns daily aggregates for trend analysis. `days` is clamped to 3–60.

Each row includes:

```json
{
  "day": "2026-05-19",
  "feedingMl": 720,
  "feedingCount": 6,
  "avgFeedMl": 120,
  "sleepMin": 420,
  "sleepCount": 4,
  "wetCount": 5,
  "dirtyCount": 1,
  "note": "optional daily note"
}
```

The response also contains summary averages and today-vs-yesterday deltas.
