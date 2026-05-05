# Proyecto Debandi - Tienda Online

Sistema de e-commerce completo con frontend Next.js y backend Django.

## Estructura del Proyecto

```
Instalador_Brix/
├── Proyecto_Debandi/     # Frontend (Next.js 15)
│   ├── app/              # Pages y routes
│   ├── components/       # Componentes React
│   ├── contexts/         # Context providers
│   ├── services/         # Servicios API
│   ├── lib/              # Utilidades
│   └── public/           # Assets estáticos
│
├── back_debandi/         # Backend (Django 4.2)
│   ├── config/           # Configuración Django
│   ├── gestion/          # App principal (models, views)
│   ├── api/              # Archivos DBF/CDX
│   └── media/            # Uploads
│
└── docs/                 # Documentación
```

## Requisitos

### Backend
- Python 3.10+
- Django 4.2+

### Frontend
- Node.js 18+
- npm o yarn

## Instalación

### Backend
```bash
cd back_debandi
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Frontend
```bash
cd Proyecto_Debandi
npm install
npm run dev
```

## Variables de Entorno

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Backend (.env)
```
SECRET_KEY=tu-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

## URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Admin Django**: http://localhost:8000/admin

## Funcionalidades

- Catálogo de productos con filtros
- Carrito de compras
- Sistema de pedidos
- Autenticación con Email/Contraseña
- Panel de vendedores con impersonación
- Exportación PDF/Excel
- Integración Mercado Pago
- Transferencia bancaria

## Documentación Adicional

Ver carpeta `/docs` para guías detalladas sobre:
- Configuración OAuth
- Integración Mercado Pago
- Seguridad y auditoría
- Despliegue en producción
