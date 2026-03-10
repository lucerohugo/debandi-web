# 💳 Configuración de Transferencia Bancaria

## Visión General

El sistema ahora incluye una página dedicada para **instrucciones de transferencia bancaria**. Cuando un cliente selecciona la opción **"Transferencia Bancaria (Contado - CDO)"** y realiza el pedido:

1. ✅ Se crea el pedido en la base de datos
2. ✅ Se redirige a una página de instrucciones
3. 📋 Se muestran los datos bancarios (CBU, alias, titular, etc.)
4. 📋 Se incluyen instrucciones paso a paso
5. 📧 El cliente recibe confirmación por email

---

## 📁 Archivos Relacionados

### Backend (Django)

**Configuración de datos bancarios:**
- 📄 [`back_debandi/gestion/bank_config.py`](back_debandi/gestion/bank_config.py) - Datos DEMO y función `get_bank_data()`

**Endpoint:**
- 📄 [`back_debandi/gestion/auth_views.py`](back_debandi/gestion/auth_views.py) - Función `get_bank_data_endpoint()`
- 📄 [`back_debandi/gestion/urls.py`](back_debandi/gestion/urls.py) - Ruta `/api/transfer/bank-data/`

### Frontend (Next.js)

**Página de instrucciones:**
- 📄 [`Proyecto_Debandi/app/checkout/transfer/page.tsx`](Proyecto_Debandi/app/checkout/transfer/page.tsx) - UI y lógica

**Modificaciones en checkout:**
- 📄 [`Proyecto_Debandi/app/checkout/page.tsx`](Proyecto_Debandi/app/checkout/page.tsx) - Redirección a `/checkout/transfer`

---

## 🔧 Cómo Cambiar los Datos Bancarios

### Opción 1: Editar el archivo `bank_config.py` (Rápido)

Abre [`back_debandi/gestion/bank_config.py`](back_debandi/gestion/bank_config.py) y reemplaza los valores DEMO:

```python
BANK_DATA = {
    'banco': 'Banco Nación',                    # ← CAMBIAR
    'titular': 'DEBANDI DISTRIBUCIONES S.R.L.', # ← CAMBIAR
    'cbu': '0720123456789012345678',            # ← CAMBIAR (22 dígitos)
    'cuit': '30-71234567-9',                    # ← CAMBIAR
    'cuenta': '123456789',                      # ← CAMBIAR
    'alias': 'DEBANDI.DISTRIB.ARG',             # ← CAMBIAR (3 palabras)
}
```

**Ejemplo con datos reales:**

```python
BANK_DATA = {
    'banco': 'Banco Santander',
    'titular': 'MI EMPRESA S.A.',
    'cbu': '0720987654321098765432',
    'cuit': '30-87654321-9',
    'cuenta': '987654321',
    'alias': 'EMPRESA.SANTA.ARG',
}
```

Luego reinicia el servidor Django:
```bash
python manage.py runserver
```

### Opción 2: Variables de Entorno (Recomendado para Producción)

Para no hardcodear credenciales, usa variables de entorno:

1. **En tu `.env.local` o archivo de configuración del servidor:**

```bash
BANK_BANCO=Banco Santander
BANK_TITULAR=MI EMPRESA S.A.
BANK_CBU=0720987654321098765432
BANK_CUIT=30-87654321-9
BANK_CUENTA=987654321
BANK_ALIAS=EMPRESA.SANTA.ARG
```

2. **El código en `bank_config.py` las lee automáticamente:**

```python
BANK_DATA = {
    'banco': os.getenv('BANK_BANCO', BANK_DATA['banco']),
    'titular': os.getenv('BANK_TITULAR', BANK_DATA['titular']),
    # ... etc
}
```

---

## 📋 Datos Requeridos

| Campo | Descripción | Ejemplo | Notas |
|-------|-------------|---------|-------|
| **Banco** | Nombre del banco | Banco Nación | Completo |
| **Titular** | Titular de la cuenta | EMPRESA S.A. | Nombre o razón social |
| **CBU** | Código Bancario Único | 0720123456789012345678 | Exactamente 22 dígitos |
| **CUIT** | CUIT/CUIL | 30-71234567-9 | Formato: XX-XXXXXXXX-X |
| **Cuenta** | Número de cuenta | 123456789 | Puede variar en longitud |
| **Alias** | Alias CVU | EMPRESA.PALABRA.ARG | 3 palabras separadas por puntos |

---

## 🔍 Flujo de Funcionamiento

### 1. Cliente selecciona "Transferencia Bancaria" en checkout

```
[Checkout] → (opción: Transferencia Bancaria) → [Click Realizar Pedido]
```

### 2. Backend procesa el pedido

```python
POST /api/pedidos/crear/ {
    "total": 1500.00,
    "forma_pago": "CDO",
    "items": [...]
}

↓ Crea pedido ORD-12345 ↓
```

### 3. Frontend redirige a página de instrucciones

```
/checkout → /checkout/transfer?order=ORD-12345&total=1500.00
```

### 4. Página de transferencia carga datos bancarios

```
GET /api/transfer/bank-data/ → {
    "banco": "Banco Nación",
    "titular": "DEBANDI...",
    ...
}
```

### 5. Cliente ve instrucciones con datos copiables

```
┌─────────────────────────────────────┐
│  Información de Transferencia       │
│                                     │
│  Número de Pedido: ORD-12345       │
│  Monto: $1.500,00                   │
│                                     │
│  CBU: [0720...  📋]                 │
│  Alias: [DEBANDI... 📋]            │
│  ...                                │
│                                     │
│  [Continuar Comprando] [Ir al Inicio]
└─────────────────────────────────────┘
```

---

## 🎨 Personalización

### Cambiar textos o instrucciones

Edita [`Proyecto_Debandi/app/checkout/transfer/page.tsx`](Proyecto_Debandi/app/checkout/transfer/page.tsx):

```tsx
<h1 className="text-3xl font-bold text-foreground">
  Información de Transferencia  {/* ← CAMBIAR AQUÍ */}
</h1>
```

### Cambiar estilo/colores

Modifica las clases Tailwind en el mismo archivo:

```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    ↑
            Estos colores
</div>
```

### Agregar más campos

Si necesitas campos adicionales (por ejemplo, teléfono de contacto):

1. Añade a `BANK_DATA` en [`bank_config.py`](back_debandi/gestion/bank_config.py)
2. El endpoint `/api/transfer/bank-data/` los devolverá automáticamente
3. Usa en el frontend para mostrar

---

## 🧪 Pruebas

### 1. Verificar que el endpoint funciona

```bash
curl http://localhost:8000/api/transfer/bank-data/
```

Deberías ver:
```json
{
    "banco": "Banco Nación",
    "titular": "DEBANDI DISTRIBUCIONES S.R.L.",
    "cbu": "0720123456789012345678",
    "cuit": "30-71234567-9",
    "cuenta": "123456789",
    "alias": "DEBANDI.DISTRIB.ARG"
}
```

### 2. Flujo completo

1. Login como cliente
2. Agregar productos al carrito
3. Ir a checkout
4. Seleccionar "Transferencia Bancaria (CDO)"
5. Click "Realizar Pedido"
6. ✅ Deberías ver la página `/checkout/transfer` con los datos

### 3. Verificar que se copia al portapapeles

- Hacer click en los botones 📋 junto a cada dato
- Deberías ver "Copiado al portapapeles" en verde

---

## 📝 Notas Importantes

### Validación de CBU

El CBU debe tener **exactamente 22 dígitos**:
```
✅ 0720123456789012345678  (22 dígitos)
❌ 072012345678901234567   (21 dígitos)
❌ 07201234567890123456789 (23 dígitos)
```

### Formato de Alias

El alias debe ser de máximo 20 caracteres, con 3 palabras separadas por puntos:
```
✅ EMPRESA.PALABRA.ARG
✅ DEBANDI.DISTRIB.ARG
❌ EMPRESA  (1 palabra)
❌ EMPRESA.PALABRA.EXTRA.ARG  (4 palabras)
```

### Seguridad

- ⚠️ Los datos bancarios se envían por API pública (sin autenticación)
- ✅ Esto es correcto: los datos bancarios son públicos
- ⚠️ **NUNCA** incluyas datos sensibles como contraseñas o tokens

---

## 🚀 Para Producción

1. **Usa variables de entorno** en lugar de hardcoding
2. **Configura HTTPS** en la página `/checkout/transfer`
3. **Añade logging** para rastrear transferencias recibidas
4. **Implementa webhook** para confirmar transferencias automáticamente
5. **Envía email** al cliente cuando se confirme la transferencia

---

## ❓ Preguntas Frecuentes

**P: ¿Qué pasa si alguien pone un monto diferente?**
A: Es responsabilidad del cliente. El sistema muestra el monto exacto. Puedes implementar reconciliación bancaria más adelante.

**P: ¿Cómo confirmo que se recibió la transferencia?**
A: Actualmente manual. Futuro: integrar API bancaria para confirmar automáticamente.

**P: ¿Puedo mostrar datos bancarios diferentes por cliente?**
A: Sí, modifica `get_bank_data_endpoint()` para que acepte parámetros y devuelva datos personalizados.

**P: ¿Y si tengo múltiples cuentas bancarias?**
A: Puedes devolverlas como un array desde `get_bank_data()` y dejar que el cliente elija.

---

## 📞 Contacto / Soporte

Si tienes preguntas o necesitas ajustes, modifica los archivos según lo requieras.

**Archivos clave:**
- 🔧 Datos: [`bank_config.py`](back_debandi/gestion/bank_config.py)
- 🛣️ Rutas: [`urls.py`](back_debandi/gestion/urls.py)
- 📡 API: [`auth_views.py`](back_debandi/gestion/auth_views.py)
- 🎨 UI: [`transfer/page.tsx`](Proyecto_Debandi/app/checkout/transfer/page.tsx)

---

**Última actualización:** 3 de febrero de 2026
