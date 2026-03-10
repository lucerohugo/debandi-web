from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal



#Provincia--------------------------------------------------------------------------------------------------------------------------------
class Provincia(models.Model):
    pci_codi = models.AutoField(primary_key=True)
    pci_nomb = models.CharField(max_length=100)

    def __str__(self):
        return self.pci_nomb     

#Zona--------------------------------------------------------------------------------------------------------------------------------
class Zona(models.Model):
    zon_codi = models.AutoField(primary_key=True)
    zon_nomb = models.CharField(max_length=100)

    def __str__(self):
        return self.zon_nomb     


#Localidad--------------------------------------------------------------------------------------------------------------------------------
class Localidad(models.Model):
    loc_codi= models.AutoField(primary_key=True)
    loc_nomb = models.CharField(max_length=100)
    pci_codi = models.ForeignKey(Provincia, on_delete=models.PROTECT)
    zon_codi = models.ForeignKey(Zona, on_delete=models.PROTECT)

    def __str__(self):
        return self.loc_nomb  


#Clientes--------------------------------------------------------------------------------------------------------------------------------
class Clientes(models.Model):
    cli_codi = models.AutoField(primary_key=True)   #codigo_cliente
    cli_nomb = models.CharField(max_length=100) #nombre_cliente
    cli_doc = models.CharField(max_length=8, unique=True, blank=True, null=True) #documento 
    cli_emai = models.EmailField(unique=True, blank=True, null=True)  #email
    cli_cuit = models.CharField(max_length=20, unique=True, blank=True, null=True)  #cuit
    cli_tele=  models.CharField(max_length=20, blank=True)  #telefono
    cli_dire = models.CharField(max_length=150, blank=True)  #direccion
    cli_bar = models.CharField(max_length=100, blank=True)  #barrio
    cli_pswd = models.CharField(max_length=255, blank=True)  #contraseña hasheada (PBKDF2-SHA256)
    cli_rtok = models.CharField(max_length=255, blank=True, null=True)  #token de recuperacion de contraseña
    cli_rexp = models.DateTimeField(blank=True, null=True)  #expiración del token de recuperacion #ver bien esto 4/12/2026
    loc_codi = models.ForeignKey(Localidad, on_delete=models.PROTECT) #localidad
    ven_codi = models.ForeignKey('Vendedor', on_delete=models.SET_NULL, null=True, blank=True) #vendedor


    cli_org = models.CharField(
        max_length=20,  
        choices=(
            ('ADMIN', 'Admin Django'),
            ('SCRIPT', 'Script automático'),
            ('API', 'API'),
        ),
        default='ADMIN'
    )

    cli_fchc = models.DateTimeField(
        auto_now_add=True,
        help_text="Fecha de creación"
    )

    cli_fmod = models.DateTimeField(
        auto_now=True,
        help_text="Última modificación"
    )

    # bdf / GeneXus
    cli_exp = models.BooleanField(
        default=False,
        help_text="Indica si el cliente ya fue exportado a BrixSoft"
    )

    cli_fexp = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha de exportación a GeneXus"
    )

    def __str__(self):
        return f"{self.cli_nomb} - {self.cli_doc}"

#Marca--------------------------------------------------------------------------------------------------------------------------------
class Marca(models.Model):
    mar_codi = models.AutoField(primary_key=True)
    mar_nomb = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.mar_nomb

#Rubro--------------------------------------------------------------------------------------------------------------------------------
class Rubro(models.Model):
    rub_codi = models.AutoField(primary_key=True)
    rub_nomb = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.rub_nomb


#Subrubro------------------------------------------------------------------------------------------------------------------------
class SubRubro(models.Model):
    sru_codi = models.AutoField(primary_key=True)
    sru_nomb = models.CharField(max_length=100)
    rub_codi = models.ForeignKey(Rubro,on_delete=models.PROTECT,related_name="subrubros")

    class Meta:
        unique_together = ('sru_nomb', 'sru_codi')

    def __str__(self):
        return f"{self.sru_nomb} {self.rub_codi.rub_nomb}"

#Articulos------------------------------------------------------------------------------------------------------------------------- 
class Articulo(models.Model):
    # Constantes del IVA para Articulos
    IVA_CHOICES = (
        ('21', '21%'),
        ('27', '27%'),
        ('10.5', '10,5%'),
        ('0', '0% (Exento)'),
    )
    
    # Opciones de depósito
    DEPOSITO_CHOICES = (
        ('DEPOSITO_ABAJO', 'Depósito Abajo'),
        ('DEPOSITO_ARRIBA', 'Depósito Arriba'),
        ('DEPOSITO_ENFRENTE', 'Depósito Enfrente'),
        ('PRINCIPAL', 'Principal'),
        ('SIN_DEFINIR', 'Sin Definir'),
    )
    
    art_codi = models.AutoField(primary_key=True)    #codigo_articulo
    art_cint = models.CharField(max_length=50, blank=True, null=True)  #codigo_interno
    art_sku = models.CharField(max_length=100, blank=True, null=True)  #sku
    art_nomb = models.CharField(max_length=100)  #nombre_articulo 
    art_desc = models.TextField(blank=True) #descripcion_articulo
    art_pnet = models.DecimalField(max_digits=12, decimal_places=2)    #precio_neto
    art_pfin = models.DecimalField(max_digits=12, decimal_places=2, editable=False)       #precio final con iva y todo
    art_cost = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)      #costo
    art_stkp = models.PositiveIntegerField(default=0) # stock_principal
    art_stkmin = models.PositiveIntegerField(default=0) # stock_minimo
    art_stkmax = models.PositiveIntegerField(default=0) # stock_maximo
    art_xbul = models.BooleanField(default=False)  # art_por_bulto O PACK
    art_ubul = models.PositiveIntegerField(default=1) #unidades_por_bulto
    art_img = models.ImageField(upload_to='articulos/', blank=True, null=True)  #imagen_articulo
    art_depo = models.CharField(max_length=30, choices=DEPOSITO_CHOICES, default='SIN_DEFINIR')  #deposito_predeterminado
    art_mext = models.BooleanField(default=False, help_text="Marcar si el precio está en moneda extranjera (USD)")  #moneda extranjera

    mar_codi = models.ForeignKey(Marca, on_delete=models.PROTECT, default=12882)#marca id
    sru_codi = models.ForeignKey(SubRubro, on_delete=models.PROTECT, blank=True, null=True) #subrubro id
    art_tiva = models.CharField(max_length=5, choices=IVA_CHOICES, default='21', help_text="IVA del artículo")

    art_acti = models.BooleanField(default=True)          #activo

    #bdf
    art_exp = models.BooleanField(
        default=False,  
        help_text="Indica si el/o los articulos ya fueron exportado a BrixSoft(Genexus)") #indica la exportacion en tilde o cruz
    art_fexp = models.DateTimeField(
        null=True, 
        blank=True,  
        help_text="Indica la fecha que se exportaron los articulos"
        )  #indica la fecha de exportacion


    

    def get_iva_rate(self):
        """Obtiene el IVA del artículo (siempre tiene valor por default)"""
        return float(self.art_tiva) if self.art_tiva else 21

    def save(self, *args, **kwargs):
        iva_rate = Decimal(str(self.get_iva_rate()))
        self.art_pfin = self.art_pnet * (1 + iva_rate / 100)
        super().save(*args, **kwargs)

    @property
    def art_precio_final(self):
        """Precio final con IVA incluido (alias de art_pfin)"""
        return self.art_pfin

    @property
    def art_piva(self):
        """Alias para compatibilidad con art_pfin"""
        if self.art_xbul:
            return self.art_pfin * self.art_ubul
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
        return f"{self.art_nomb} - {self.mar_codi.mar_nomb}"


    art_org = models.CharField( #articulo_origen es decir de donde viene,si de django ,si del script o api
    max_length=20,
    choices=(
        ('ADMIN', 'Admin Django'),
        ('SCRIPT', 'Script automático'),
        ('API', 'API'),
    ),
        default='ADMIN'
    )

    art_fchc = models.DateTimeField( #art_fecha creacion del script admin 
        auto_now_add=True,
        help_text="Fecha de creación"
    )

    art_fmod = models.DateTimeField( #ultima_modificacion del articulo del admin scritp o lo que sea
        auto_now=True,
        help_text="Última modificación"
    )

    art_visw = models.BooleanField(
        default=True,
        help_text="Marcar para que el artículo sea visible en la web"
    )  # visible_en_web

#Favoritos--------------------------------------------------------------------------------------------------------------------------
class Favoritos(models.Model):
    fav_codi = models.AutoField(primary_key=True)
    cli_codi = models.ForeignKey(Clientes, on_delete=models.CASCADE, related_name='favoritos')  #cliente
    art_codi = models.ForeignKey(Articulo, on_delete=models.CASCADE)  #articulo
    fav_fecha = models.DateTimeField(auto_now_add=True)  #fecha_agregado

    class Meta:
        unique_together = ('cli_codi', 'art_codi')  # Un cliente no puede tener el mismo artículo dos veces en favoritos

    def __str__(self):
        return f"{self.cli_codi.cli_nomb} - {self.art_codi.art_nomb}"

#Usuario----------------------------------------------------------------------------------------------------------------------------
class Usuario(models.Model):
    ROL_CHOICES = (
        ('ADMIN' , 'Administrador'),
        ('CLI', 'Cliente')
    )

    usu_perf = models.OneToOneField(User, on_delete=models.PROTECT, null= True, blank=True, related_name='perfil_usuario')#usuario
    usu_nomb = models.CharField(max_length=100) #nombre
    usu_rol = models.CharField(max_length=10, choices=ROL_CHOICES, default='CLI')   #rol
    usu_fcre = models.DateTimeField(auto_now_add=True)  #fecha_creacion


    def __str__(self): 
        return f"{self.usu_nomb} [{self.get_rol_display()}]"

#Pedidos-------------------------------------------------------------------------------------------------------------------------------
class Pedidos(models.Model):
    ESTADO_CHOICES = (
        ('P', 'Pendiente'),
        ('PA', 'Pagado'),
        ('F', 'Facturado'),
        ('C', 'Cancelado'),
    )

    FORMA_PAGO_CHOICES = (
        ('CDO', 'Contado'),
        ('CTC','Cuenta Corriente'),
        ('CHQ','Cheque'),
        ('MP', 'Mercado Pago'),
    )

    ped_codi = models.AutoField(primary_key=True) #codigo_pedido 
    cli_codi = models.ForeignKey(Clientes, on_delete=models.PROTECT, related_name='pedidos')  #cliente
    ped_esta = models.CharField(max_length=2, choices=ESTADO_CHOICES, default='P') #estado_pedido, esto lo deberia sacar
    ped_tota = models.DecimalField(max_digits=12,decimal_places=2,default=0,validators=[MinValueValidator(0)]) # total_pedido
    ped_fech = models.DateTimeField(default=timezone.now)  # fecha_pedido
    ped_fpag = models.CharField(max_length=3, choices=FORMA_PAGO_CHOICES) #forma_pago_pedido 
    bco_codi = models.ForeignKey('CuentaBancaria', on_delete=models.SET_NULL, null=True, blank=True, related_name='pedidos') # banco para transferencia


    ped_exp = models.BooleanField( #muestra si el pedido fue exportado a la bdf o no 
        default=False,
        help_text="Indica si el pedido ya fue exportado a Genexus"
    )

    ped_fech_exp = models.DateTimeField( #fecha en la cual se exporto del back a la bdf 
        null=True,
        blank=True,
        help_text="Fecha en la que el pedido fue exportado"
    )
    

    def actualizar_total(self):
        total = self.detalles.aggregate(
            total=models.Sum('dpe_subt')
        )['total'] or 0

        self.ped_tota = total
        self.save(update_fields=['ped_tota'])


    def puede_modificarse(self):
        return self.ped_esta == 'P'

    def __str__(self):
        return f"Pedido {self.ped_codi} - {self.cli_codi.cli_nomb}"


        
#DetallePedido-------------------------------------------------------------------------------------------------------------
class DetallePedido(models.Model):
    dpe_codi = models.AutoField(primary_key=True) #detalle_pedido_codigo
    dpe_deta = models.ForeignKey(Pedidos, on_delete=models.CASCADE, related_name= 'detalles') #apunta directamen en el ped_codi
    art_codi = models.ForeignKey(Articulo, on_delete=models.PROTECT) #articulo 
    dpe_cant = models.PositiveIntegerField(validators=[MinValueValidator(1)])# detalle_pedido_cantidad
    dpe_prec = models.DecimalField(max_digits=12, decimal_places=2) #detalle_pedido_precio
    dpe_des = models.DecimalField(max_digits=12, decimal_places=2, default=0) #detalle_pedido_descuento /// esto lo deberia de ser: art_desc y asociarlo aca en el detalle de pedido
    dpe_subt = models.DecimalField(max_digits=12, decimal_places=2, editable=False) #detalle_pedido_subtotal

    def save(self, *args, **kwargs):
        # No permitir cambios si el pedido no está pendiente
        if not self.dpe_deta.puede_modificarse():
            raise ValidationError("No se puede modificar un pedido facturado o cancelado")

        if not self.pk:
            if self.art_codi.art_stkp < self.dpe_cant:
                raise ValidationError("Stock insuficiente")

            # Descontar stock
            self.art_codi.art_stkp -= self.dpe_cant
            self.art_codi.save()

        # Calcular subtotal (el precio ya debe estar seteado desde afuera)
        self.dpe_subt = (self.dpe_cant * self.dpe_prec) - self.dpe_des

        super().save(*args, **kwargs)

        # Actualizar total del pedido
        self.dpe_deta.actualizar_total()

    def delete(self, *args, **kwargs):
        # Reponer stock
        self.art_codi.art_stkp += self.dpe_cant
        self.art_codi.save()

        pedido = self.dpe_deta
        super().delete(*args, **kwargs)

        pedido.actualizar_total()

    def __str__(self):
        return f"{self.art_codi.art_nomb} x {self.dpe_cant}"


class General(models.Model):
    
    gen_codi = models.AutoField(primary_key=True)

    #Identidad
    gen_nomb = models.CharField(max_length=100, default='Debandi')
    gen_raz = models.CharField(max_length=150, blank=True, default='Debandi Distribuciones') #razon_social
    gen_logo = models.ImageField(upload_to='general/', blank=True, null=True, default='general/logo-debandi.svg') #logo_empresa #200x80 (625x250)

    #Fiscal
    gen_cuit = models.CharField(max_length=20, default='00-00000000-0')

    #Personalización
    gen_colo = models.CharField(max_length=7, default='#8cced9', help_text="Color principal de la aplicación (formato HEX)") #color pagina debandi: #8cced9 

    #Ubicacion / contacto
    gen_loc = models.ForeignKey(Localidad, on_delete=models.PROTECT, null=True, blank=True)
    gen_dire = models.CharField(max_length=150, blank=True, default='')
    gen_tele = models.CharField(max_length=20, blank=True, default='')
    gen_emai = models.EmailField(blank=True, default='contacto@debandi.com')

    def __str__(self):
        return self.gen_nomb


# Carrito de Compras --------------------------------------------------------
class CarritoItem(models.Model):
    cli_codi = models.ForeignKey(Clientes, on_delete=models.CASCADE, related_name="carrito_items")
    art_codi = models.ForeignKey(Articulo, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    # Guardar los precios en el momento en que se agrega
    art_pnet = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    art_pfin = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fecha_agregado = models.DateTimeField(auto_now_add=True)
    fecha_actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('cli_codi', 'art_codi')
        ordering = ['-fecha_actualizado']

    def __str__(self):
        return f"{self.cli_codi.cli_nomb} - {self.art_codi.art_nomb} x {self.cantidad}"


# Cuentas Bancarias en teorica esto no va --------------------------------------------------------
class CuentaBancaria(models.Model):
    TIPO_CUENTA_CHOICES = (
        ('CAJA_AHORRO', 'Caja de Ahorro'),
        ('CUENTA_CORRIENTE', 'Cuenta Corriente'),
        ('CUENTA_VISA', 'Cuenta Visa'),
    )

    bco_codi = models.AutoField(primary_key=True)  # codigo_cuenta_bancaria
    bco_nomb = models.CharField(max_length=100)  # nombre_banco (ej: Banco Nación, Banco Provincia)
    bco_titu = models.CharField(max_length=100)  # titular_cuenta
    bco_cuit = models.CharField(max_length=20)  # CUIT_del_titular
    bco_tip = models.CharField(max_length=20, choices=TIPO_CUENTA_CHOICES, default='CAJA_AHORRO')  # tipo_cuenta
    bco_num = models.CharField(max_length=50)  # numero_cuenta
    bco_cbu = models.CharField(max_length=22, unique=True)  # CBU (Código Bancario Único - 22 dígitos)
    bco_ali = models.CharField(max_length=50, unique=True)  # alias_CBU (ej: DEBANDI.COM.AR)

    # Campos adicionales útiles
    bco_acti = models.BooleanField(default=True)  # cuenta_activa
    bco_obs = models.TextField(blank=True, null=True)  # observaciones

    bco_fchc = models.DateTimeField(auto_now_add=True)  # fecha_creacion
    bco_fmod = models.DateTimeField(auto_now=True)  # fecha_ultima_modificacion

    class Meta:
        verbose_name = "Cuenta Bancaria"
        verbose_name_plural = "Cuentas Bancarias"
        ordering = ['-bco_acti', 'bco_nomb']

    def __str__(self):
        return f"{self.bco_nomb} - {self.bco_ali} ({self.bco_titu})"
    



# Vendedores-----------------------------------------------------------------------
class Vendedor(models.Model):
    ven_codi = models.AutoField(primary_key=True) 
    ven_nomb = models.CharField(max_length=100, blank=True, null=True)  # Nombre
    ven_doc = models.CharField(max_length=20, unique=True, blank=True, null=True)  # Documento
    ven_fnac = models.DateField(blank=True, null=True)  # Fecha de nacimiento
    ven_emai = models.EmailField(blank=True, null=True)  # Email
    ven_tele = models.CharField(max_length=20, blank=True)  # Teléfono
    ven_dom = models.CharField(max_length=100, blank=True, null=True) # domicilio
    ven_bar = models.CharField(max_length=100, blank=True, null=True) #barrio
    ven_cuit = models.CharField(max_length=10, blank=True, null=True) #cuit
    loc_codi = models.ForeignKey('Localidad', on_delete=models.SET_NULL, null=True, blank=True, related_name='vendedores')  # Localidad
    
    # Campos de autenticación
    ven_usua = models.CharField(max_length=50, unique=True, blank=True, null=True, help_text="Usuario para login")
    ven_pass = models.CharField(max_length=255, blank=True, null=True, help_text="Contraseña hasheada")
    ven_actv = models.BooleanField(default=False, help_text="Vendedor activo para login")
    
    ven_fchc = models.DateTimeField(auto_now_add=True, help_text="Fecha de creación")
    ven_fmod = models.DateTimeField(auto_now=True, help_text="Última modificación")
    
    class Meta:
        verbose_name = "Vendedor"
        verbose_name_plural = "Vendedores"
        ordering = ['ven_nomb']
    
    def __str__(self):
        return self.ven_nomb 