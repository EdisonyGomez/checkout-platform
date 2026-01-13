# Checkout Platform (Prueba Técnica)

SPA en React + Redux (mobile-first) y API en NestJS + Prisma + Postgres.
Flujo completo de checkout con tarjeta (sandbox), actualización de stock, webhooks y status polling.

## Demo (Deploy)
- Web (Frontend): [<URL>](https://checkout-platform-web.vercel.app/)
- API (Backend): [<URL>](https://checkout-platform.onrender.com/)
- Swagger / Postman: <URL o ruta>

## Arquitectura
- **Frontend**: React + Redux Toolkit + localStorage recovery
- **Backend**: NestJS + Prisma (adapter-pg) + Postgres
- **Patrones**:
  - Use Cases (application layer)
  - Repositorios (infrastructure/data)
  - Railway Oriented Programming (Result/Errors)
  - Idempotencia (Idempotency-Key, WebhookEvent)

## Flujo de negocio (5 pasos)
1) Product page: lista productos + unidades disponibles  
2) Modal: tarjeta + delivery (validación, detección VISA/MC)  
3) Summary: backdrop con desglose (producto + base fee + delivery fee)  
4) Final status: polling de estado + fallback sync  
5) Redirect: vuelve al catálogo con stock actualizado  

## Endpoints principales
- GET /api/products
- POST /api/checkout/init
- POST /api/checkout/pay
- GET /api/transactions/:public_number/status
- POST /api/transactions/:public_number/sync
- POST /api/webhooks/events (webhook)


## Instalación y ejecución local
### Requisitos
- Node 20+
- pnpm
- Postgres (o Supabase)

### Instalar
```bash
pnpm i
