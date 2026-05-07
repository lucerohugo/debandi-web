from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import (
    ProvinciaViewSet, LocalidadViewSet, ZonaViewSet,
    MarcaViewSet, RubroViewSet, SubrubroViewSet, ArticuloViewSet,
    ClientesViewSet, VendedorViewSet, FavoritosViewSet, CarritoItemViewSet,
    PedidosViewSet, DetallePedidoViewSet, CuentaBancariaViewSet,
    GeneralViewSet, UsuarioViewSet, get_csrf_token, health_check, vendedor_login, 
    importar_datos, cliente_login, cliente_register, cliente_update_password, favoritos_manage,
    carrito_manage, vendedor_impersonate, vendedor_stop_impersonation, vendedor_check_impersonation,
    crear_pedido_desde_carrito
)

# 👇 CLAVE: agregar trailing_slash opcional
router = DefaultRouter(trailing_slash='/?')

# Ubicaciones geográficas
router.register(r'provincias', ProvinciaViewSet, basename='provincia')
router.register(r'localidades', LocalidadViewSet, basename='localidad')
router.register(r'zonas', ZonaViewSet, basename='zona')

# Catálogo de productos
router.register(r'marcas', MarcaViewSet, basename='marca')
router.register(r'rubros', RubroViewSet, basename='rubro')
router.register(r'subrubros', SubrubroViewSet, basename='subrubro')
router.register(r'articulos', ArticuloViewSet, basename='articulo')

# Personas
router.register(r'clientes', ClientesViewSet, basename='cliente')
router.register(r'vendedores', VendedorViewSet, basename='vendedor')

# Favoritos y Carrito
router.register(r'favoritos', FavoritosViewSet, basename='favorito')
router.register(r'carrito', CarritoItemViewSet, basename='carrito-item')

# Pedidos
router.register(r'pedidos', PedidosViewSet, basename='pedido')
router.register(r'detalles-pedidos', DetallePedidoViewSet, basename='detalle-pedido')

# Configuración
router.register(r'cuentas-bancarias', CuentaBancariaViewSet, basename='cuenta-bancaria')
router.register(r'general', GeneralViewSet, basename='general')
router.register(r'usuarios', UsuarioViewSet, basename='usuario')

urlpatterns = [
    path('', include(router.urls)),
    # JWT Token endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Custom authentication endpoints
    path('vendedores-login/', vendedor_login, name='vendedor-login'),
    path('cliente-login/', cliente_login, name='cliente-login'),
    path('cliente-register/', cliente_register, name='cliente-register'),
    path('cliente-update-password/', cliente_update_password, name='cliente-update-password'),
    path('favoritos-manage/', favoritos_manage, name='favoritos-manage'),
    path('carrito-manage/', carrito_manage, name='carrito-manage'),
    path('pedidos-crear-desde-carrito/', crear_pedido_desde_carrito, name='crear-pedido-desde-carrito'),
    path('vendedor/impersonate/', vendedor_impersonate, name='vendedor-impersonate'),
    path('vendedor/stop-impersonation/', vendedor_stop_impersonation, name='vendedor-stop-impersonation'),
    path('vendedor/check-impersonation/', vendedor_check_impersonation, name='vendedor-check-impersonation'),
    path('csrf/', get_csrf_token, name='csrf-token'),
    path('health/', health_check, name='health-check'),
    path('importar_datos/', importar_datos, name='importar-datos'),
]

