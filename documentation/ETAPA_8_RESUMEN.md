# Etapa 8 — Frontend Admin (subscription-admin-web)

## Resumen
Frontend administrativo en React 19 + Vite + TypeScript para la plataforma de suscripciones. Proporciona una interfaz visual para gestionar clientes, suscripciones, facturas, pagos, multas, prorrogas y validacion de acceso.

## Estructura del proyecto
```
subscription-admin-web/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .gitignore
├── README.md
└── src/
    ├── main.tsx           # Punto de entrada React
    ├── App.tsx            # Rutas principales
    ├── components/
    │   └── Layout.tsx     # Layout con sidebar de navegacion
    ├── pages/
    │   ├── Dashboard.tsx      # Dashboard resumen
    │   ├── Customers.tsx      # Lista de clientes
    │   ├── Subscriptions.tsx  # Lista de suscripciones
    │   ├── Invoices.tsx       # Lista de facturas
    │   ├── Payments.tsx       # Lista de pagos
    │   ├── Penalties.tsx      # Lista de multas
    │   ├── Extensions.tsx     # Lista de prorrogas
    │   └── Entitlements.tsx   # Validacion de acceso
    ├── services/
    │   └── api.ts         # Cliente axios con interceptores
    ├── hooks/             # Custom hooks (pendiente)
    ├── utils/             # Utilidades (pendiente)
    └── styles/            # Estilos (pendiente)
```

## Caracteristicas
- React 19 con TypeScript estricto
- Vite como bundler (rapido en desarrollo)
- React Router DOM v7 para navegacion
- Axios para llamadas HTTP con interceptores de auth
- Layout con sidebar de navegacion
- 8 paginas funcionales con tablas de datos
- Respuestas uniformes del API manejadas en interceptores

## Endpoints consumidos
- `GET /customers` — Lista de clientes
- `GET /subscriptions` — Lista de suscripciones
- `GET /invoices` — Lista de facturas
- `GET /payments` — Lista de pagos
- `GET /penalties` — Lista de multas
- `GET /extensions` — Lista de prorrogas
- `POST /entitlements/validate` — Validacion de acceso

## Verificacion
- `npm run dev` — Inicia servidor en puerto 5173
- `npm run build` — Compila correctamente
- `npm run preview` — Previsualiza build de produccion