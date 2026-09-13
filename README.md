# Mira Notes Manager

A standalone React application containing only Mira's notes experience. The existing backend and every current frontend application remain separate and unchanged.

## Existing backend contract

- `GET /api/notes`
- `POST /api/notes`
- `PUT /api/notes/:id`
- `PATCH /api/notes/:id/status`
- `DELETE /api/notes/:id`

Note writes use the existing fields: `title`, `content`, `notebook`, `tags`, `status`, `pinned`, and `starred`.

This project intentionally contains no diary endpoints, models, routes, navigation, or reflection features.

## Authentication integration

Authentication UI and Firebase are intentionally omitted. Register a token provider later without changing the notes API modules:

```js
import { configureAccessTokenProvider } from "./api/client";

configureAccessTokenProvider(async () => yourAuthSession.getAccessToken());
```

Without a provider, requests are sent without an `Authorization` header.

## Later setup

Install the declared packages only when you are ready to run the project. No dependency installation, build, preview, application execution, deployment, or test execution was performed while this source was created.

