# Deploy OCNE For Free

OCNE is a full-stack app. It needs:

- Node.js web service
- MySQL database
- HTTPS for microphone, camera, and screen sharing

## Recommended Free Setup

Use Render Free for the Node web service, and use a free/trial MySQL provider for `DATABASE_URL`.

Render's free web service can run OCNE, but Render's own free database is PostgreSQL, while this app currently uses MySQL. Use a MySQL URL like:

```text
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

Good temporary choices for testing are Railway MySQL trial/free credits or any free hosted MySQL service. For a real long-term site, use a paid MySQL database.

## Render Steps

1. Push this project to GitHub.
2. Create a Render account.
3. Click `New` -> `Blueprint`.
4. Connect the GitHub repository.
5. Render reads `render.yaml`.
6. Add this environment variable:

```text
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

7. Deploy.
8. Open the Render URL.

## Environment Variables

```text
NODE_ENV=production
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
ENABLE_WS=false
VITE_ENABLE_WS=false
```

`ENABLE_WS=false` is intentional for free one-port hosting. Chat and calls still work through database polling. Direct voice/video uses WebRTC in the browsers.

## After Deploy

- Register two users.
- Accept a friend request.
- Open OCNE in two different browsers.
- Test direct messages and calls.

Camera, microphone, and screen sharing require HTTPS. Render gives HTTPS automatically.
