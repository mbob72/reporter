# TODO

- [ ] Сессия с refresh token

На backend для POST /auth/refresh и POST /auth/logout:
проверять Origin против allowlist (API_CORS_ORIGINS/отдельный список);
при mismatch возвращать 403.
Если планируется cross-site (SameSite=None):
добавить CSRF token header-проверку для этих endpoint’ов.
Оставить refresh cookie:
HttpOnly=true,
Secure=true в production,
SameSite=lax где возможно.

- [ ] TanStack vs RTQ
- [ ] Очередь с BullMQ
- [ ] Хранение файлов, кеширование
