# NexPath backend
Node.js 18+ · Express · SQLite

    cp .env.example .env     # set CORS_ORIGIN to where your frontend runs
    npm install
    npm start                # http://localhost:3000

All /api routes except POST /api/session need: Authorization: Bearer <token>

| Method | Route | Purpose |
|---|---|---|
| POST | /api/session | Create anonymous session -> { token } |
| GET | /api/state | All saved data (profile, resume, match, activity, notifsRead) |
| PUT | /api/state/profile | Body { value: {name,college,degree,branch,year,gradYear,interests,role} } |
| PUT | /api/state/activity | Body { value: [ {type,text,at} ] } |
| PUT | /api/state/notifsRead | Body { value: true } |
| POST | /api/resume | multipart, field "resume" (PDF/DOCX/TXT, max 5 MB) -> { resume, match, activity } |
| GET | /api/match | { role, score, matched, missing } |
| DELETE | /api/state | Reset all data |
