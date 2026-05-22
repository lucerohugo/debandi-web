from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import secrets


# ================================================================
# UBICACIONES GEOGRÁFICAS
# ================================================================

class Provincia(models.Model):
    """Provincias/Departamentos"""
    pci_codi = models.IntegerField(primary_key=True, editable=True)
    pci_nomb = models.CharField(max_length=100)

    class Meta:
        verbose_name = "Provincia"
        verbose_name_plural = "Provincias"
        ordering = ["pci_nomb"]

    def __str__(self):
        return self.pci_nomb


class Zona(models.Model):
    """Zonas geográficas"""
    zon_codi = models.IntegerField(primary_key=True, editable=True)
    zon_nomb = models.CharField(max_length=100, null=True)

    class Meta:
        verbose_name = "Zona"
        verbose_name_plural = "Zonas"
        ordering = ["zon_nomb"]

    def __str__(self):
        return self.zon_nomb


class Localidad(models.Model):
    """Localidades/Ciudades"""
    loc_codi = models.IntegerField(primary_key=True, editable=True)
    loc_nomb = models.CharField(max_length=100)
    loc_cpos = models.CharField(max_length=5, blank=True, null=True, help_text="Código postal")
    pci_codi = models.ForeignKey(Provincia, on_delete=models.PROTECT, related_name="localidades")

    class Meta:
        verbose_name = "Localidad"
        verbose_name_plural = "Localidades"
        ordering = ["pci_codi", "loc_nomb"]

    def __str__(self):
        return f"{self.loc_nomb} ({self.loc_cpos})" if self.loc_cpos else self.loc_nomb  


# ================================================================
# CATÁLOGO DE PRODUCTOS
# ================================================================

class Marca(models.Model):
    """Marcas de productos"""
    mar_codi = models.IntegerField(primary_key=True, editable=True)
    mar_nomb = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Marca"
        verbose_name_plural = "Marcas"
        ordering = ["mar_nomb"]

    def __str__(self):
        return self.mar_nomb


class Rubro(models.Model):
    """Rubros/Categorías principales"""
    rub_codi = models.IntegerField(primary_key=True, editable=True)
    rub_nomb = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Rubro"
        verbose_name_plural = "Rubros"
        ordering = ["rub_nomb"]

    def __str__(self):
        return self.rub_nomb


class SubRubro(models.Model):
    """Sub-rubros/Categorías dentro de un rubro"""
    sru_codi = models.IntegerField(primary_key=True, editable=True)
    sru_nomb = models.CharField(max_length=100)
    rub_codi = models.ForeignKey(Rubro, on_delete=models.PROTECT, related_name="subrubros")

    class Meta:
        verbose_name = "Sub-rubro"
        verbose_name_plural = "Sub-rubros"
        ordering = ["rub_codi", "sru_nomb"]
        unique_together = ("rub_codi", "sru_nomb")

    def __str__(self):
        return f"{self.sru_nomb} ({self.rub_codi.rub_nomb})"


class Articulo(models.Model):
    """Artículos/Productos"""
    art_codi = models.IntegerField(primary_key=True, editable=True)
    art_sku = models.CharField(max_length=100, blank=True, null=True, help_text="SKU")
    art_nomb = models.CharField(max_length=100)
    art_desc = models.TextField(blank=True, help_text="Descripción del artículo", null=True)
    art_palac = models.CharField(max_length=255, blank=True, null=True, help_text="Palabras clave para búsqueda si es complejo el art_nomb")
    art_descu = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Descuento", null=True)
    art_pnet = models.DecimalField(max_digits=12, decimal_places=2, help_text="Precio neto", null=True)
    art_pfin = models.DecimalField(max_digits=12, decimal_places=2, editable=True, help_text="Precio final con IVA")
    art_cost = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, help_text="Costo")
    art_stk = models.PositiveIntegerField(default=0, help_text="Stock de artículos", null=True)
    art_xbul = models.BooleanField(default=False, help_text="Por bulto/pack", null=True)
    art_ubul = models.PositiveIntegerField(default=1, help_text="Unidades por bulto", null=True)
    art_img = models.ImageField(upload_to='articulos/', blank=True, null=True)
    art_depo = models.IntegerField(default=0, help_text="Depósito", null=True)
    art_mext = models.BooleanField(default=False, help_text="Precio en moneda extranjera (USD)", null=True)
    art_tiva = models.DecimalField(max_digits=5, decimal_places=2, default=21, help_text="IVA del artículo (%)", null=True)

    mar_codi = models.ForeignKey(Marca, on_delete=models.PROTECT, related_name="articulos", default=1)
    sru_codi = models.ForeignKey(SubRubro, on_delete=models.PROTECT, blank=True, null=True, related_name="articulos")

    art_acti = models.BooleanField(default=True, help_text="Artículo activo",null=True)
    art_visw = models.BooleanField(default=True, help_text="Visible en web", null=True)
    art_carru = models.BooleanField(default=False, help_text="Mostrar en carrusel de inicio", null=True)

    art_org = models.CharField(
        max_length=20,
        choices=(
            ('ADMIN', 'Admin Django'),
            ('SCRIPT', 'Script automático'),
            ('API', 'API'),
        ),
        default='ADMIN'
    )

    art_exp = models.BooleanField(default=False, help_text="Exportado a GeneXus")
    art_fexp = models.DateTimeField(null=True, blank=True, help_text="Fecha de exportación")

    art_fchc = models.DateTimeField(auto_now_add=True)
    art_fmod = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Artículo"
        verbose_name_plural = "Artículos"
        ordering = ["art_nomb"]

    def get_iva_rate(self):
        """Obtiene el IVA del artículo"""
        return float(self.art_tiva) if self.art_tiva else 21

    def save(self, *args, **kwargs):
        iva_rate = Decimal(str(self.get_iva_rate()))
        # Solo recalcular art_pfin si es 0 o None (no ha sido editado manualmente)
        if not self.art_pfin or self.art_pfin == 0:
            self.art_pfin = (self.art_pnet * (1 + iva_rate / 100)) - self.art_descu
        super().save(*args, **kwargs)

    @property
    def art_precio_final(self):
        """Precio final con IVA incluido"""
        return self.art_pfin

    @property
    def art_sru_nomb(self):
        """Nombre del subrubro"""
        return self.sru_codi.sru_nomb if self.sru_codi else '-'

    @property
    def art_rub_nomb(self):
        """Nombre del rubro"""
        return self.sru_codi.rub_codi.rub_nomb if self.sru_codi and self.sru_codi.rub_codi else '-'

    def __str__(self):
        marca = self.mar_codi.mar_nomb if self.mar_codi else "Sin marca"
        return f"{self.art_nomb} - {marca}"


# ================================================================
# CLIENTES Y AUTENTICACIÓN
# ================================================================



class Registro(models.Model):
    """Registros pendientes de aprobación para convertirse en clientes"""
    reg_codi = models.AutoField(primary_key=True)
    reg_nomb = models.CharField(max_length=150, help_text="Nombre")
    reg_apel = models.CharField(max_length=150, help_text="Apellido", null=True)
    reg_doc = models.IntegerField(help_text="Documento")
    reg_emai = models.EmailField(unique=True, help_text="Email")
    reg_clav = models.CharField(max_length=128, help_text="Contraseña (hasheada)")
    reg_clie = models.BooleanField(default=False, help_text="Aprobado/Convertido a Cliente")
    reg_fchc = models.DateTimeField(auto_now_add=True, help_text="Fecha de creación")
    reg_fmod = models.DateTimeField(auto_now=True, help_text="Fecha de modificación")
    reg_exp = models.BooleanField(default=False, help_text="Exportado a GeneXus")
    
    class Meta:
        verbose_name = "Registro"
        verbose_name_plural = "Registros"
        ordering = ["-reg_fchc"]
    
    def __str__(self):
        return f"{self.reg_nomb} {self.reg_apel} ({self.reg_emai})"
    
    def set_password(self, raw_password):
        """Hashear contraseña"""
        from django.contrib.auth.hashers import make_password
        self.reg_clav = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Verificar contraseña"""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.reg_clav)



class Clientes(models.Model):
    """Clientes compradores"""
    cli_codi = models.IntegerField(primary_key=True, editable=True)
    cli_nomb = models.CharField(max_length=150, help_text="Nombre del cliente")
    cli_fnac = models.DateField(blank=True, null=True, help_text="Fecha de nacimiento")
    cli_tdoc = models.CharField(max_length=20, default="DNI", help_text="Tipo de documento", null=True)
    cli_ndoc = models.CharField(max_length=20, blank=True, null=True, help_text="Número de documento")
    cli_doc = models.CharField(max_length=8, blank=True, null=True, help_text="Documento (legado)")
    cli_cuit = models.CharField(max_length=20, blank=True, null=True, unique=True, help_text="CUIT")
    cli_emai = models.EmailField(blank=True, null=True, unique=True, help_text="Email")
    cli_celu = models.CharField(max_length=20, blank=True, null=True, help_text="Celular")
    cli_tele = models.CharField(max_length=20, blank=True, help_text="Teléfono", null=True)
    cli_dire = models.CharField(max_length=150, blank=True, help_text="Dirección", null=True)
    cli_bar = models.CharField(max_length=100, blank=True, help_text="Barrio", null=True)
    cli_estc = models.CharField(max_length=50, blank=True, null=True, help_text="Estado civil")
    cli_ocup = models.CharField(max_length=100, blank=True, null=True, help_text="Ocupación")
    cli_acti = models.BooleanField(default=True, help_text="Cliente activo/de baja",null=True)
    cli_exp = models.BooleanField(default=False, help_text="Exportado a GeneXus")

    cli_clav = models.CharField(max_length=128, blank=True, help_text="Contraseña/Clave (hasheada)")
    cli_rtok = models.CharField(max_length=255, blank=True, null=True, help_text="Token de recuperación")
    cli_rexp = models.DateTimeField(blank=True, null=True, help_text="Expiración del token")

    loc_codi = models.ForeignKey(Localidad, on_delete=models.PROTECT, related_name="clientes", null=True)
    ven_codi = models.ForeignKey('Vendedor', on_delete=models.SET_NULL, null=True, blank=True, related_name="clientes")

    cli_org = models.CharField(
        max_length=20,
        choices=(
            ('ADMIN', 'Admin Django'),
            ('SCRIPT', 'Script automático'),
            ('API', 'API'),
        ),
        default='ADMIN'
    )

    cli_exp = models.BooleanField(default=False, help_text="Exportado a BrixSoft")
    cli_fexp = models.DateTimeField(null=True, blank=True, help_text="Fecha de exportación")

    cli_fchc = models.DateTimeField(auto_now_add=True)
    cli_fmod = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["cli_nomb"]

    def save(self, *args, **kwargs):
        """Hashear contraseña si es texto plano (no comienza con algoritmo Django)"""
        from django.contrib.auth.hashers import make_password
        
        if self.cli_clav:
            # Si no está hasheada (no comienza con 'pbkdf2_sha256' o similar), hashearla
            if not self.cli_clav.startswith('pbkdf2_sha256$') and \
               not self.cli_clav.startswith('pbkdf2_sha1$') and \
               not self.cli_clav.startswith('argon2_argon2id$') and \
               not self.cli_clav.startswith('scrypt$') and \
               not self.cli_clav.startswith('bcrypt_sha256$') and \
               len(self.cli_clav) < 100:  # Los hashes son más largos
                self.cli_clav = make_password(self.cli_clav)
        
        super().save(*args, **kwargs)

    def set_password(self, raw_password):
        """Establece la contraseña hasheada"""
        from django.contrib.auth.hashers import make_password
        if raw_password and raw_password.strip():
            self.cli_clav = make_password(raw_password)

    def check_password(self, raw_password):
        """Verifica si la contraseña coincide"""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.cli_clav)

    def __str__(self):
        return f"{self.cli_nomb} - {self.cli_ndoc or self.cli_doc or 'S/D'}"



class Favoritos(models.Model):
    """Artículos favoritos de clientes"""
    fav_codi = models.AutoField(primary_key=True)
    cli_codi = models.ForeignKey(Clientes, on_delete=models.CASCADE, related_name='favoritos')
    art_codi = models.ForeignKey(Articulo, on_delete=models.CASCADE, related_name='en_favoritos')
    fav_fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Favorito"
        verbose_name_plural = "Favoritos"
        unique_together = ('cli_codi', 'art_codi')
        ordering = ['-fav_fecha']

    def __str__(self):
        return f"{self.cli_codi.cli_nomb} - {self.art_codi.art_nomb}"


class CarritoItem(models.Model):
    """Items del carrito de compras"""
    carr_codi = models.AutoField(primary_key=True)
    cli_codi = models.ForeignKey(Clientes, on_delete=models.CASCADE, related_name="carrito_items")
    art_codi = models.ForeignKey(Articulo, on_delete=models.CASCADE)
    carr_cant = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    carr_pnet = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    carr_pfin = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    carr_fech = models.DateTimeField(auto_now_add=True)
    carr_fmod = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Carrito Item"
        verbose_name_plural = "Carrito Items"
        unique_together = ('cli_codi', 'art_codi')
        ordering = ['-carr_fmod']

    def __str__(self):
        return f"{self.cli_codi.cli_nomb} - {self.art_codi.art_nomb} x {self.carr_cant}"


# ================================================================
# PEDIDOS
# ================================================================

class Pedidos(models.Model):
    """Pedidos de compra - Cabecera"""
    FORMA_PAGO_CHOICES = (
        ('CDO', 'Contado'),
        ('CTC', 'Cuenta Corriente'),
        ('CHQ', 'Cheque'),
        ('TRF', 'Transferencia'),
    )

    ped_codi = models.AutoField(primary_key=True)
    ped_fech = models.DateField(blank=True, null=True, help_text="Fecha del pedido")
    ped_hora = models.TimeField(blank=True, null=True, help_text="Hora del pedido")
    cli_codi = models.ForeignKey(Clientes, on_delete=models.PROTECT, related_name='pedidos', null=True, blank=True)
    ped_tota = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    ped_fpag = models.CharField(max_length=3, choices=FORMA_PAGO_CHOICES)
    ped_exp = models.BooleanField(default=False, help_text="Exportado a GeneXus")
    ped_fexp = models.DateTimeField(null=True, blank=True, help_text="Fecha de exportación")

    class Meta:
        verbose_name = "Pedido"
        verbose_name_plural = "Pedidos"
        ordering = ['-ped_codi']

    def actualizar_total(self):
        """Calcula el total como suma de (dpe_cant * art_pfin) de todos los detalles"""
        from django.db.models import F, Sum, DecimalField, ExpressionWrapper
        
        total = self.detalles.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F('dpe_cant') * F('art_codi__art_pfin'),
                    output_field=DecimalField()
                )
            )
        )['total'] or Decimal('0')
        self.ped_tota = total
        self.save(update_fields=['ped_tota'])

    def puede_modificarse(self):
        """Retorna True si el pedido puede editarse (ped_exp = False = Pendiente)"""
        return not self.ped_exp
    
    def marcar_como_procesado(self):
        """Marca el pedido como procesado (ped_exp = True)"""
        from django.utils import timezone
        self.ped_exp = True
        self.ped_fexp = timezone.now()
        self.save(update_fields=['ped_exp', 'ped_fexp'])

    def __str__(self):
        cliente_nombre = self.cli_codi.cli_nomb if self.cli_codi else "Sin cliente"
        # ✅ Validar que ped_fech no sea None
        fecha_str = self.ped_fech.strftime('%d/%m/%Y') if self.ped_fech else 'S/F'
        return f"Pedido {self.ped_codi} - {cliente_nombre} ({fecha_str})"


class DetallePedido(models.Model):
    """Detalles de líneas en un pedido"""
    dpe_codi = models.AutoField(primary_key=True)
    ped_codi = models.ForeignKey(Pedidos, on_delete=models.CASCADE, related_name='detalles')
    art_codi = models.ForeignKey(Articulo, on_delete=models.CASCADE, related_name='en_pedidos')
    dpe_cant = models.PositiveIntegerField(default=1, help_text="Cantidad pedida")

    class Meta:
        verbose_name = "Detalle Pedido"
        verbose_name_plural = "Detalles Pedidos"
        ordering = ['ped_codi', 'dpe_codi']
        unique_together = ('ped_codi', 'art_codi')  # No repetir artículos en un pedido

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Actualizar total del pedido
        self.ped_codi.actualizar_total()

    def delete(self, *args, **kwargs):
        # Actualizar total del pedido antes de eliminar
        pedido = self.ped_codi
        super().delete(*args, **kwargs)
        pedido.actualizar_total()

    def __str__(self):
        return f"{self.art_codi.art_nomb} (Ped: {self.ped_codi.ped_codi})"


# ================================================================
# CONFIGURACIÓN Y DATOS GENERALES
# ================================================================

class CuentaBancaria(models.Model):
    """Cuentas bancarias de la empresa"""
    TIPO_CUENTA_CHOICES = (
        ('CAJA_AHORRO', 'Caja de Ahorro'),
        ('CUENTA_CORRIENTE', 'Cuenta Corriente'),
        ('CUENTA_VISA', 'Cuenta Visa'),
    )

    bco_codi = models.AutoField(primary_key=True)
    bco_nomb = models.CharField(max_length=100)
    bco_titu = models.CharField(max_length=100, help_text="Titular de la cuenta")
    bco_cuit = models.CharField(max_length=20)
    bco_tip = models.CharField(max_length=20, choices=TIPO_CUENTA_CHOICES, default='CAJA_AHORRO')
    bco_num = models.CharField(max_length=50)
    bco_cbu = models.CharField(max_length=22, unique=True, help_text="Código Bancario Único")
    bco_ali = models.CharField(max_length=50, unique=True, help_text="Alias CBU")
    bco_acti = models.BooleanField(default=True)
    bco_obs = models.TextField(blank=True, null=True, help_text="Observaciones")
    bco_fchc = models.DateTimeField(auto_now_add=True)
    bco_fmod = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cuenta Bancaria"
        verbose_name_plural = "Cuentas Bancarias"
        ordering = ['-bco_acti', 'bco_nomb']

    def __str__(self):
        return f"{self.bco_nomb} - {self.bco_ali}"


class General(models.Model):
    """Datos generales de la empresa"""
    gen_codi = models.IntegerField(primary_key=True, editable=True)
    gen_nomb = models.CharField(max_length=150, blank=True, help_text="Nombre de la empresa")
    gen_raz = models.CharField(max_length=150, blank=True, default='Debandi Distribuciones', help_text="Razón social")
    gen_logo = models.ImageField(upload_to='logos/', blank=True, null=True, help_text="Logo de Debandi")
    gen_loge = models.ImageField(upload_to='logos/', blank=True, null=True, help_text="Logo de BrixSoft")
    gen_cuit = models.CharField(max_length=20, default='00-00000000-0', help_text="CUIT de la empresa")
    gen_colo = models.CharField(max_length=7, default='#8cced9', help_text="Color principal (HEX)")
    gen_loc = models.ForeignKey(Localidad, on_delete=models.SET_NULL, null=True, blank=True)
    gen_dire = models.CharField(max_length=150, blank=True, help_text="Dirección")
    gen_tele = models.CharField(max_length=20, blank=True, help_text="Teléfono")
    gen_emai = models.EmailField(blank=True, default='contacto@debandi.com', help_text="Email")
    gen_coti = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Cotización")

    class Meta:
        verbose_name = "General"
        verbose_name_plural = "General"

    def __str__(self):
        return self.gen_nomb or "Configuración General"


class Usuario(models.Model):
    """Usuarios administradores"""
    ROL_CHOICES = (
        ('ADMIN', 'Administrador'),
        ('USER', 'Usuario'),
    )

    usu_perf = models.OneToOneField(User, on_delete=models.CASCADE, related_name='usuario')
    usu_nomb = models.CharField(max_length=100)
    usu_rol = models.CharField(max_length=20, choices=ROL_CHOICES, default='USER')
    usu_fcre = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        ordering = ["usu_nomb"]

    def __str__(self):
        return self.usu_nomb


class Vendedor(models.Model):
    """Vendedores"""
    ven_codi = models.IntegerField(primary_key=True, editable=True)
    ven_nomb = models.CharField(max_length=100)
    ven_doc = models.CharField(max_length=20, blank=True, null=True, help_text="Documento")
    ven_fnac = models.DateField(blank=True, null=True, help_text="Fecha de nacimiento")
    ven_emai = models.EmailField(blank=True, null=True) #le puse null a email
    ven_tele = models.CharField(max_length=20, blank=True, null=True)
    ven_dom = models.CharField(max_length=150, blank=True, help_text="Domicilio", null=True)
    ven_bar = models.CharField(max_length=100, blank=True, help_text="Barrio", null=True)
    ven_cuit = models.CharField(max_length=20, blank=True, null=True, help_text="CUIT")
    ven_usua = models.CharField(max_length=50, blank=True, null=True, unique=True, help_text="Usuario para login")
    ven_clav = models.CharField(max_length=128, blank=True, null=True, help_text="Contraseña/Clave (hasheada)")
    ven_actv = models.IntegerField(default=0, choices=[(0, 'Inactivo'), (1, 'Activo')], help_text="Vendedor activo", null=True)
    loc_codi = models.ForeignKey(Localidad, on_delete=models.SET_NULL, null=True, blank=True, related_name='vendedores')
    ven_fchc = models.DateTimeField(auto_now_add=True,null=True)
    ven_fmod = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        verbose_name = "Vendedor"
        verbose_name_plural = "Vendedores"
        ordering = ["ven_nomb"]

    def save(self, *args, **kwargs):
        """Hashear contraseña si es texto plano (no comienza con algoritmo Django)"""
        from django.contrib.auth.hashers import make_password
        
        if self.ven_clav:
            # Si no está hasheada (no comienza con 'pbkdf2_sha256' o similar), hashearla
            if not self.ven_clav.startswith('pbkdf2_sha256$') and \
               not self.ven_clav.startswith('pbkdf2_sha1$') and \
               not self.ven_clav.startswith('argon2_argon2id$') and \
               not self.ven_clav.startswith('scrypt$') and \
               not self.ven_clav.startswith('bcrypt_sha256$') and \
               len(self.ven_clav) < 100:  # Los hashes son más largos
                self.ven_clav = make_password(self.ven_clav)
        
        super().save(*args, **kwargs)

    def set_password(self, raw_password):
        """Establece la contraseña hasheada"""
        from django.contrib.auth.hashers import make_password
        if raw_password and raw_password.strip():
            self.ven_clav = make_password(raw_password)

    def check_password(self, raw_password):
        """Verifica si la contraseña coincide"""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.ven_clav)

    def __str__(self):
        return self.ven_nomb
