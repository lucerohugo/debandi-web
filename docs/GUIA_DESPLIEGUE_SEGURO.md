# 🔐 GUÍA DE DESPLIEGUE SEGURO - DEBANDI

**Última actualización:** 5 de febrero de 2026

---

## ✅ CAMBIOS IMPLEMENTADOS

### Backend (Django)

#### 1. ✅ Hash de Contraseñas
- **Antes:** `hashlib.pbkdf2_hmac()` con salt hardcodeado
- **Ahora:** Django's `make_password()` y `check_password()`
- **Ventaja:** Salt único por usuario, algoritmo automático

#### 2. ✅ SECRET_KEY Protegida
- **Antes:** Exponía default value en código
- **Ahora:** Lanza excepción si no existe en .env
- **Acción:** Generar clave nueva: `python manage.py shell`

#### 3. ✅ Logging en lugar de Print
- **Antes:** `print(traceback.format_exc())` exponía información
- **Ahora:** `logger.error(..., exc_info=True)` → solo logs
- **Ventaja:** Logs privados, sin exposición en consola

#### 4. ✅ ALLOWED_HOSTS Seguro
- **Antes:** Default `*` permitía cualquier host
- **Ahora:** Default `localhost,127.0.0.1`
- **Producción:** Especificar dominios reales

#### 5. ✅ Cookies Seguras
- **Antes:** `SECURE=False` por defecto
- **Ahora:** `SECURE=True` por defecto
- **Efecto:** Cookies solo se envían por HTTPS

#### 6. ✅ Sin Secrets en Logs
- **Antes:** Google OAuth secrets se imprimían
- **Ahora:** Solo warnings de importancia
- **Ventaja:** Credenciales protegidas

#### 7. ✅ DEBUG Default False
- **Antes:** Default `True`
- **Ahora:** Default `False`
- **Seguridad:** Error pages no exponen código

---

## 🚀 INSTRUCCIONES DE IMPLEMENTACIÓN

### Paso 1: Actualizar Backend

```bash
cd back_debandi

# 1. Generar nueva SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# 2. Copiar el resultado en .env
# SECRET_KEY=<pegar-aqui-el-resultado>

# 3. Validar que .env tenga:
# DEBUG=True  (en desarrollo)
# ALLOWED_HOSTS=localhost,127.0.0.1
# SECRET_KEY=tu-clave-nueva

# 4. Actualizar contraseñas existentes a nuevo formato
python manage.py shell
```

```python
# En el shell de Django
from gestion.models import Clientes
from django.contrib.auth.hashers import make_password

# Si hay clientes con contraseñas antiguas (hash manual)
for cliente in Clientes.objects.all():
    if cliente.cli_pswd and not cliente.cli_pswd.startswith('pbkdf2_'):
        # Rehasher con el nuevo método
        cliente.cli_pswd = make_password(cliente.cli_pswd)  # ⚠️ Requiere saber la contraseña original
        # MEJOR: Forzar reset de contraseña

# Salir
exit()
```

### Paso 2: Validar Configuración

```bash
# Ejecutar checks de Django
python manage.py check --deploy

# Validar que no hay errores
# Output: All checks passed. Ready for deployment.
```

### Paso 3: Despliegue a Producción

```bash
# 1. Usar .env.production como plantilla
cp .env.production .env.prod  # En servidor real

# 2. Completar valores reales:
# - SECRET_KEY (generada)
# - ALLOWED_HOSTS (tu dominio)
# - Database credentials
# - Email credentials
# - Google OAuth credentials
# - Mercado Pago credentials

# 3. Establecer variables:
export DJANGO_SETTINGS_MODULE=config.settings
export DEBUG=False
export SECRET_KEY=tu-clave-nueva

# 4. Ejecutar migraciones
python manage.py migrate

# 5. Recolectar archivos estáticos
python manage.py collectstatic --noinput

# 6. Usar Gunicorn/uWSGI en lugar de runserver
gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --worker-class sync
```

---

## 🔒 CONFIGURACIÓN POR AMBIENTE

### Desarrollo (localhost)

```env
DEBUG=True
SECRET_KEY=tu-clave-desarrollo
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
SESSION_COOKIE_SECURE=False
AUTH_COOKIE_SECURE=False
DATABASE=SQLite (default)
EMAIL_BACKEND=console
```

### Staging

```env
DEBUG=False
SECRET_KEY=tu-clave-staging
ALLOWED_HOSTS=staging.tudominio.com
CORS_ALLOWED_ORIGINS=https://staging.tudominio.com
SESSION_COOKIE_SECURE=True
AUTH_COOKIE_SECURE=True
DATABASE=PostgreSQL
EMAIL_BACKEND=SMTP
```

### Producción

```env
DEBUG=False
SECRET_KEY=tu-clave-produccion-aleatoria
ALLOWED_HOSTS=tudominio.com,www.tudominio.com
CORS_ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com
SESSION_COOKIE_SECURE=True
AUTH_COOKIE_SECURE=True
DATABASE=PostgreSQL con respaldo
EMAIL_BACKEND=SMTP real
REDIS_URL=Redis remoto
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] **SECRET_KEY** generada y guardada en .env (nunca en código)
- [ ] **DEBUG=False** en producción
- [ ] **ALLOWED_HOSTS** especificados (sin `*`)
- [ ] **Database** migrada a PostgreSQL en producción
- [ ] **Cookies SECURE** = True en HTTPS
- [ ] **Email** configurado para recuperación de contraseña
- [ ] **HTTPS** habilitado (Let's Encrypt gratuito)
- [ ] **Logs** configurados para archivo (no consola)
- [ ] **Backups** automatizados de base de datos
- [ ] **Rate limiting** en endpoints de autenticación
- [ ] **CORS** restringido a dominios específicos
- [ ] **Google OAuth** credenciales en .env (nunca en código)
- [ ] **Mercado Pago** credenciales en .env (nunca en código)
- [ ] **Monitoreo** de errores activo (Sentry, DataDog, etc.)

---

## 🔧 HERRAMIENTAS DE SEGURIDAD RECOMENDADAS

### Monitoreo de Errores
```bash
pip install sentry-sdk
# Configurar en settings.py
```

### Rate Limiting
```bash
pip install django-ratelimit
# Protege endpoints de autenticación
```

### Headers de Seguridad
```bash
pip install django-cors-headers
# Ya está instalado, solo validar configuración
```

### Audit de Dependencias
```bash
pip install safety
safety check
```

---

## 📊 VULNERABILIDADES RESUELTAS

| Vulnerabilidad | Severidad | Resuelta | Prueba |
|---|---|---|---|
| Salt hardcodeado | 🔴 CRÍTICO | ✅ | Hash contiene `pbkdf2_` |
| SECRET_KEY expuesta | 🔴 CRÍTICO | ✅ | Excepción si no existe |
| Debug statements | 🔴 CRÍTICO | ✅ | Solo en logs, no en respuestas |
| ALLOWED_HOSTS=* | 🔴 CRÍTICO | ✅ | Default sin `*` |
| Cookies inseguras | 🔴 CRÍTICO | ✅ | SECURE=True default |
| Secrets en prints | 🔴 CRÍTICO | ✅ | Solo warnings |
| DEBUG default True | 🟠 ALTO | ✅ | Default False |

---

## 🧪 PRUEBAS DE SEGURIDAD

### Test 1: Validar SECRET_KEY
```bash
python -c "from django.conf import settings; print('SECRET_KEY OK' if settings.SECRET_KEY else 'FAIL')"
```

### Test 2: Validar DEBUG
```bash
python -c "from django.conf import settings; print(f'DEBUG={settings.DEBUG}')"
# Debe ser False en producción
```

### Test 3: Validar ALLOWED_HOSTS
```bash
python -c "from django.conf import settings; print(settings.ALLOWED_HOSTS)"
# NO debe contener '*'
```

### Test 4: Validar Hash de Contraseñas
```bash
python manage.py shell
from gestion.models import Clientes
cliente = Clientes.objects.first()
print(cliente.cli_pswd[:10])  # Debe empezar con 'pbkdf2_'
```

### Test 5: Validar Cookies
```bash
python -c "from django.conf import settings; print(f'SECURE={settings.SESSION_COOKIE_SECURE}')"
# Debe ser True
```

---

## 🆘 TROUBLESHOOTING

### Error: SECRET_KEY no está configurada

```
ValueError: SECRET_KEY no está configurada en .env
```

**Solución:**
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
# Copiar resultado en .env como SECRET_KEY=...
```

### Error: Las cookies no se envían

```
Si DEBUG=False y HTTPS no está habilitado, las cookies se rechazan.
```

**Solución:**
```env
# En desarrollo sin HTTPS
SESSION_COOKIE_SECURE=False
AUTH_COOKIE_SECURE=False

# O en desarrollo con HTTPS local
SESSION_COOKIE_SECURE=True
AUTH_COOKIE_SECURE=True
```

### Error: ALLOWED_HOSTS rejection

```
DisallowedHost at /
Invalid HTTP_HOST header: 'example.com'. You may need to add them to ALLOWED_HOSTS.
```

**Solución:**
```env
ALLOWED_HOSTS=example.com,www.example.com,localhost,127.0.0.1
```

---

## 📚 REFERENCIAS

- [Django Security Checklist](https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Password Hashing](https://docs.djangoproject.com/en/4.2/topics/auth/passwords/)
- [Django Logging](https://docs.djangoproject.com/en/4.2/topics/logging/)

---

## 📞 SOPORTE

Si encuentras problemas de seguridad:
1. Revisa [AUDITORIA_SEGURIDAD.md](./AUDITORIA_SEGURIDAD.md)
2. Ejecuta `python manage.py check --deploy`
3. Verifica configuración en `.env`

