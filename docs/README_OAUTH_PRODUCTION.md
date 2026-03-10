# 🔐 Guía Completa: OAuth Google + Seguridad en Producción

## futuro para google a produccion por ahora esta de manera local

## 📋 Tabla de Contenidos
1. [Arquitectura General](#arquitectura-general)
2. [Setup Local](#setup-local)
3. [Seguridad en Desarrollo](#seguridad-en-desarrollo)
4. [Migración a Producción](#migración-a-producción)
5. [Checklist de Seguridad](#checklist-de-seguridad)
6. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)

---

## 🏗️ Arquitectura General

### Flujo OAuth (Server-Side)

```
┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
│              │                    │              │                    │              │
│  FRONTEND    │                    │   BACKEND    │                    │   GOOGLE     │
│ (Next.js)    │                    │  (Django)    │                    │              │
│              │                    │              │                    │              │
└──────────────┘                    └──────────────┘                    └──────────────┘
       │                                   │                                   │
       │  1. Click "Google Login"          │                                   │
       ├──────────────────────────────────>│                                   │
       │                                   │                                   │
       │  2. Request /api/auth/google/login/                                  │
       │                                   │                                   │
       │<──────────────────────────────────┤                                   │
       │    {"url": "https://accounts..."}  │                                   │
       │                                   │                                   │
       │  3. window.location.href = url    │                                   │
       ├───────────────────────────────────────────────────────────────────────>│
       │                                   │                                   │
       │                                   │  4. User logs in at Google        │
       │                                   │                                   │
       │<──────────────────────────────────────────────────────────────────────┤
       │    Redirect to /api/auth/google/callback/?code=xxx                    │
       │                                   │                                   │
       │                                   │  5. Backend exchanges code for    │
       │                                   │     access_token (SECRET HIDDEN)  │
       │                                   │  6. Fetch user info from Google   │
       │                                   │  7. Create/Update user in DB      │
       │                                   │  8. Set httpOnly cookie           │
       │                                   │                                   │
       │<──────────────────────────────────┤                                   │
       │  Redirect to frontend + Cookie    │                                   │
       │                                   │                                   │
       ✅ USER LOGGED IN (cookies)
```

### Por Qué Esta Arquitectura es Segura

| Componente | Ventaja |
|-----------|---------|
| **Server-Side OAuth** | Client Secret NUNCA se envía al navegador |
| **httpOnly Cookies** | JavaScript no puede acceder (protege XSS) |
| **SameSite Cookies** | Previene CSRF attacks |
| **No localStorage** | No hay tokens que robar desde DevTools |
| **Cookies automáticas** | El navegador las envía siempre (credentials: 'include') |

---

## 🚀 Setup Local

### Requisitos
- Python 3.10+
- Node.js 16+
- Git

### Instalación

```bash
# Backend
cd back_debandi
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000

# Frontend (otra terminal)
cd Proyecto_Debandi
npm install
npm run dev
```

### Variables de Entorno Local

**`back_debandi/.env`**
```bash
# Google OAuth (Obtenido de Google Cloud Console)
GOOGLE_CLIENT_ID=531724100703-iudvur91u74c3kooh632joj84v6kikru.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback/

# Django
DEBUG=True
SECRET_KEY=django-insecure-xxxxx-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1

# Cookies (Development)
AUTH_COOKIE_SECURE=False
AUTH_COOKIE_SAMESITE=Lax

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

### Testing Local

```bash
# 1. Abrir navegador
http://localhost:3000

# 2. Haz click en modal de login → "Continuar con Google"

# 3. Completa login en Google

# 4. Deberías volver logueado

# 5. Verificar en DevTools (F12)
# Application → Cookies → buscar "auth-token"
# Debe estar marcada como "HttpOnly" ✅
```

---

## 🔒 Seguridad en Desarrollo

### Configuración Actual (Local)

```python
# back_debandi/config/settings.py

SESSION_COOKIE_HTTPONLY = True        # ✅ JavaScript no puede leerlo
SESSION_COOKIE_SECURE = False         # ⚠️ OK para desarrollo sin HTTPS
SESSION_COOKIE_SAMESITE = 'Lax'      # ✅ Previene CSRF básico
SESSION_COOKIE_AGE = 1209600          # 14 días
```

### Cosas a NO hacer en Desarrollo

```python
# ❌ NUNCA en código
GOOGLE_CLIENT_SECRET = "GOCSPX-..."

# ❌ NUNCA en Git
.env (agrega a .gitignore)

# ❌ NUNCA hardcodear URLs
CORS_ALLOWED_ORIGINS = "*"

# ❌ NUNCA token en localStorage
localStorage.setItem('auth-token', token)

# ✅ Siempre usa variables de entorno
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
```

### .gitignore (Verificar)

```bash
# Crear/verificar .gitignore en raíz

*.env
.env
.env.local
.env.*.local
venv/
node_modules/
.DS_Store
__pycache__/
*.db
db.sqlite3
```

---

## 🌐 Migración a Producción

### Paso 1: Obtener Dominio y SSL

#### 1.1 Comprar Dominio
- Recomendado: **Namecheap**, **GoDaddy**, o **Google Domains**
- Ejemplo: `debandi.com.ar`

#### 1.2 Certificado SSL Gratis
- **Let's Encrypt** (Recomendado: Gratis y automático)
- Usar **Certbot** con nginx/Apache

```bash
# En tu servidor
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d debandi.com.ar -d www.debandi.com.ar

# Renovación automática (Certbot lo hace solo)
sudo systemctl enable certbot.timer
```

### Paso 2: Configurar Dominio

```bash
# En tu registrador de dominios (Namecheap, etc.)
# Agregar registros DNS:

@          A          123.45.67.89        (IP de tu servidor)
www        CNAME      debandi.com.ar      
api        CNAME      debandi.com.ar
```

### Paso 3: Actualizar Google OAuth

**En Google Cloud Console:**

1. Ir a: https://console.cloud.google.com
2. Proyecto → Credenciales → Tu aplicación OAuth
3. Autorized redirect URIs:
   - Agregar: `https://debandi.com.ar/api/auth/google/callback/`
   - Agregar: `https://www.debandi.com.ar/api/auth/google/callback/`
4. Authorized origins:
   - Agregar: `https://debandi.com.ar`
   - Agregar: `https://www.debandi.com.ar`

### Paso 4: Servidor de Producción

#### Opción A: VPS (Recomendado - Control Total)

**Proveedores:**
- **DigitalOcean** ($6-12/mes)
- **Linode** ($5-10/mes)
- **Hetzner** (Más barato en EU)
- **Vultr** (Global)

**Setup:**
```bash
# En tu VPS
ssh root@123.45.67.89

# Actualizar
apt update && apt upgrade -y

# Instalar dependencias
apt install -y python3-pip python3-venv nginx postgresql git

# Clonar tu proyecto
git clone https://github.com/tuuser/debandi.git
cd debandi/back_debandi

# Setup Django
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Crear base de datos PostgreSQL
sudo -u postgres psql
CREATE DATABASE debandi_db;
CREATE USER debandi_user WITH PASSWORD 'strong_password_here';
ALTER ROLE debandi_user SET client_encoding TO 'utf8';
ALTER ROLE debandi_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE debandi_user SET default_transaction_deferrable TO off;
ALTER ROLE debandi_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE debandi_db TO debandi_user;
\q
```

#### Opción B: Heroku (Más Fácil, Menos Control)

```bash
# Instalar Heroku CLI
# Luego:
heroku login
heroku create debandi-api
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main

# Configurar variables
heroku config:set GOOGLE_CLIENT_ID=xxx
heroku config:set GOOGLE_CLIENT_SECRET=xxx
```

#### Opción C: Railway / Render (Punto Medio)

- Más fácil que VPS
- Más barato que Heroku
- Recomendado: **Railway.app** o **render.com**

### Paso 5: Actualizar Configuración Backend

**`back_debandi/.env.production`**

```bash
# Google OAuth
GOOGLE_CLIENT_ID=531724100703-iudvur91u74c3kooh632joj84v6kikru.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://api.debandi.com.ar/auth/google/callback/

# Django (CAMBIAR ESTAS!)
DEBUG=False
SECRET_KEY=generate-a-random-key-here-use-secrets.token_urlsafe(50)
ALLOWED_HOSTS=debandi.com.ar,www.debandi.com.ar,api.debandi.com.ar

# Base de Datos (PostgreSQL en producción)
DATABASE_URL=postgresql://debandi_user:strong_password_here@localhost:5432/debandi_db

# Cookies (HTTPS en Producción)
AUTH_COOKIE_SECURE=True
AUTH_COOKIE_SAMESITE=Strict
AUTH_COOKIE_MAX_AGE=1209600

# CORS Restringido
CORS_ALLOWED_ORIGINS=https://debandi.com.ar,https://www.debandi.com.ar

# Email (para recuperación de contraseña)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Frontend URL
FRONTEND_URL=https://debandi.com.ar
API_BASE_URL=https://api.debandi.com.ar
```

### Paso 6: Configurar Django para Producción

**`back_debandi/config/settings.py`** - Agregar al final:

```python
# ================== PRODUCCIÓN ==================
if not DEBUG:
    # HTTPS
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    
    # Headers de seguridad
    SECURE_HSTS_SECONDS = 31536000  # 1 año
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # Protección adicional
    X_FRAME_OPTIONS = 'DENY'
    SECURE_CONTENT_SECURITY_POLICY = {
        'default-src': ("'self'",),
        'script-src': ("'self'", "'unsafe-inline'", "cdn.jsdelivr.net"),
        'style-src': ("'self'", "'unsafe-inline'"),
        'img-src': ("'self'", "data:", "https:"),
    }
    
    # Usar PostgreSQL en producción
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'debandi_db'),
            'USER': os.getenv('DB_USER', 'debandi_user'),
            'PASSWORD': os.getenv('DB_PASSWORD'),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }
```

### Paso 7: Desplegar Frontend

**Opción A: Vercel (Recomendado para Next.js)**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
cd Proyecto_Debandi
vercel

# Configurar variables de entorno en Vercel dashboard
NEXT_PUBLIC_API_URL=https://api.debandi.com.ar
```

**Opción B: Netlify**

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

cd Proyecto_Debandi
netlify deploy

# .env.production
NEXT_PUBLIC_API_URL=https://api.debandi.com.ar
```

**Opción C: Tu VPS (nginx)**

```bash
# En tu VPS
cd /var/www
npm run build

# Configurar nginx
sudo nano /etc/nginx/sites-available/debandi

# Agregar:
server {
    listen 443 ssl http2;
    server_name debandi.com.ar www.debandi.com.ar;

    ssl_certificate /etc/letsencrypt/live/debandi.com.ar/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/debandi.com.ar/privkey.pem;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

sudo systemctl restart nginx
```

### Paso 8: Ejecutar Migraciones en Producción

```bash
# En tu servidor de producción
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser

# Usar Gunicorn para servir Django
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

---

## ✅ Checklist de Seguridad

### 🔐 Antes de Ir a Producción

- [ ] **HTTPS/SSL** configurado
  - [ ] Let's Encrypt certificado
  - [ ] Renovación automática activa
  - [ ] Redirect HTTP → HTTPS

- [ ] **Django Settings**
  - [ ] `DEBUG = False`
  - [ ] `SECURE_SSL_REDIRECT = True`
  - [ ] `SECURE_HSTS_SECONDS = 31536000`
  - [ ] `SECRET_KEY` cambiado a valor random fuerte
  - [ ] `ALLOWED_HOSTS` específicos

- [ ] **Cookies**
  - [ ] `SESSION_COOKIE_SECURE = True`
  - [ ] `SESSION_COOKIE_HTTPONLY = True`
  - [ ] `SESSION_COOKIE_SAMESITE = 'Strict'`
  - [ ] `CSRF_COOKIE_SECURE = True`

- [ ] **Google OAuth**
  - [ ] URIs autorizados actualizados
  - [ ] Redirect URI con HTTPS
  - [ ] Origins autorizados sin `*`

- [ ] **CORS**
  - [ ] `CORS_ALLOWED_ORIGINS` solo dominios permitidos
  - [ ] NO usar `*`

- [ ] **Base de Datos**
  - [ ] PostgreSQL en producción (NO sqlite3)
  - [ ] Credenciales fuertes
  - [ ] Backups automáticos configurados
  - [ ] NO exponer en internet (usar conexión SSH)

- [ ] **Rate Limiting**
  - [ ] Implementar django-ratelimit
  - [ ] Limitar login attempts (5 intentos por IP)
  - [ ] Limitar API calls

- [ ] **Logs y Monitoreo**
  - [ ] Logs guardados en archivo
  - [ ] Monitoreo de errores (Sentry)
  - [ ] Alertas configuradas

- [ ] **Credenciales Protegidas**
  - [ ] `.env` NO en Git
  - [ ] `.env` NO en servidor (usar secrets manager)
  - [ ] Permisos 600 en archivo .env

- [ ] **Actualizaciones**
  - [ ] Django actualizado
  - [ ] Dependencias actualizadas
  - [ ] Parches de seguridad aplicados

### 🚨 Cosas Críticas

```python
# ❌ CRÍTICO: NUNCA hacer esto
DEBUG = True  # en producción

# ❌ CRÍTICO: NUNCA dejar esto
SECRET_KEY = "django-insecure-xxxxx"

# ❌ CRÍTICO: NUNCA aceptar cualquier origen
CORS_ALLOWED_ORIGINS = "*"

# ❌ CRÍTICO: NUNCA guardar en .env sin .gitignore
# .env SIEMPRE tiene que estar en .gitignore
```

---

## 📊 Monitoreo y Mantenimiento

### Rate Limiting

```python
# Instalar
pip install django-ratelimit

# En back_debandi/gestion/auth_views.py
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='5/h', method='POST')
def login(request):
    # ... código

@ratelimit(key='ip', rate='10/h', method='POST')
def register(request):
    # ... código
```

### Monitoreo de Errores (Sentry)

```python
# Instalar
pip install sentry-sdk

# En settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn="https://xxx@o1234567.ingest.sentry.io/1234567",
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,
    send_default_pii=False
)
```

### Logs

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/error.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': True,
        },
    },
}
```

### Backups Automáticos

```bash
# Crear script de backup
#!/bin/bash
BACKUP_DIR="/home/backups"
DATE=$(date +%Y-%m-%d)

# PostgreSQL backup
pg_dump debandi_db | gzip > $BACKUP_DIR/debandi_db_$DATE.sql.gz

# Subir a S3 (AWS)
aws s3 cp $BACKUP_DIR/debandi_db_$DATE.sql.gz s3://mi-bucket-backups/

# Eliminar backups antiguos
find $BACKUP_DIR -mtime +30 -delete

# Agregar a crontab
crontab -e
# Agregar: 0 2 * * * /home/scripts/backup.sh
```

### Health Check

```python
# En back_debandi/gestion/views.py
@csrf_exempt
def health_check(request):
    return JsonResponse({'status': 'healthy', 'timestamp': timezone.now()})

# En urls.py
path('health/', auth_views.health_check),
```

```bash
# Monitorear con cron
# En nginx, verificar cada 5 minutos:
curl -f https://api.debandi.com.ar/health/ || systemctl restart gunicorn
```

---

## 🔄 Actualizar a Producción (Workflow)

```bash
# 1. Hacer cambios en local
git checkout -b feature/nueva-funcionalidad
# ... hacer cambios ...
git commit -m "feat: nueva funcionalidad"

# 2. Push a staging/testing
git push origin feature/nueva-funcionalidad
# Revisar en rama testing

# 3. Merge a main/production
git checkout main
git pull
git merge feature/nueva-funcionalidad
git push origin main

# 4. En servidor de producción
ssh usuario@123.45.67.89
cd /var/www/debandi
git pull origin main

# 5. Ejecutar migraciones
python manage.py migrate

# 6. Recolectar archivos estáticos
python manage.py collectstatic --noinput

# 7. Reiniciar servicios
sudo systemctl restart gunicorn
sudo systemctl restart nginx

# 8. Verificar
curl https://api.debandi.com.ar/health/
```

---

## 💡 Tips Finales

### Seguridad

1. **Usar Variables de Entorno** para TODO
2. **HTTPS siempre** (Let's Encrypt es gratis)
3. **PostgreSQL en producción** (NO sqlite3)
4. **Backups diarios** automáticos
5. **Monitoreo continuo** (Sentry, NewRelic, etc.)
6. **Actualizaciones de seguridad** instaladas rápido

### Performance

1. **CDN** para assets estáticos (Cloudflare gratis)
2. **Caché** en Redis
3. **Compresión** de respuestas (gzip)
4. **Minificación** de JS/CSS

### Escalabilidad

1. **Load balancer** (nginx, HAProxy)
2. **Base de datos** separada del app server
3. **Celery** para tareas asincrónicas
4. **Docker** para deployments consistentes

### Documentación

```bash
# Documentar todo
- API endpoints
- Variables de entorno
- Proceso de deploy
- Contacto de emergencia
```

---

## 📞 Resumen de Recursos

| Tarea | Recomendado | Costo |
|-------|------------|-------|
| **Dominio** | Google Domains / Namecheap | $12/año |
| **SSL** | Let's Encrypt | GRATIS |
| **Servidor** | DigitalOcean / Railway | $5-15/mes |
| **BD** | PostgreSQL (incluida) | GRATIS |
| **Frontend** | Vercel / Netlify | GRATIS-$20/mes |
| **Monitoreo** | Sentry (plan free) | GRATIS |
| **Email** | SendGrid / Mailgun | GRATIS (primeros 100) |

---

## 🎯 Próximos Pasos

1. ✅ **Ahora (Local)**: Probar Google OAuth
2. 📋 **Semana 1**: Preparar variables producción
3. 🌐 **Semana 2**: Comprar dominio + SSL
4. 🚀 **Semana 3**: Deploy a servidor
5. 🔒 **Semana 4**: Auditoría de seguridad
6. 📊 **Semana 5**: Configurar monitoreo
7. 🔄 **Semana 6**: Workflow de CI/CD

---

## ❓ Dudas Comunes

**P: ¿Es seguro usar Vercel para frontend + mi VPS para backend?**
R: Sí, es la arquitectura más recomendada. Vercel maneja HTTPS/CDN automáticamente.

**P: ¿Cuándo necesito agregar rate limiting?**
R: Siempre que subas a producción. Protege contra brute-force attacks.

**P: ¿Debo usar Docker?**
R: Para equipos es mejor, pero para una app pequeña no es obligatorio.

**P: ¿Cómo manejo secrets en el servidor?**
R: Usa `/etc/environment` o `.env` con permisos 600, NUNCA en código.

**P: ¿Necesito CDN?**
R: No es obligatorio, pero Cloudflare es gratis y agrega caché + protección DDoS.

---

¡Listo para producción! 🚀
