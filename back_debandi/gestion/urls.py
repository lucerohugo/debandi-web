from django.urls import path
from . import views
from . import auth_views
from . import vendedor_views

urlpatterns = [

    # ============================================================================
    # CONFIGURACIÓN GENERAL
    # ============================================================================
    path('general/', views.general_config, name='general_config'),
    path('config/', views.app_config, name='app_config'),
    path('config/export-pdf/', views.export_pdf_config, name='export_pdf_config'),
    path('export/config/', views.export_config, name='export_config'),
    

    # ============================================================================
    # AUTENTICACIÓN Y RECUPERACIÓN DE CONTRASEÑA
    # ============================================================================
    path('auth/login/', auth_views.login, name='auth_login'),
    path('auth/register/', auth_views.register, name='auth_register'),
    path('auth/me/', auth_views.me, name='auth_me'),
    path('auth/logout/', auth_views.logout, name='auth_logout'),
    path('auth/refresh/', auth_views.refresh_token, name='auth_refresh'),
    path('auth/google/login/', auth_views.google_login, name='auth_google_login'),
    path('auth/google/callback/', auth_views.google_callback, name='auth_google_callback'),
    path('auth/request-password-reset/', auth_views.request_password_reset, name='request_password_reset'),
    path('auth/validate-reset-token/', auth_views.validate_password_reset_token, name='validate_reset_token'),
    path('auth/reset-password/', auth_views.reset_password, name='reset_password'),
    path('auth/change-password/', auth_views.change_password, name='change_password'),
    

    # ============================================================================
    # FAVORITOS
    # ============================================================================
    path('favoritos/', auth_views.favoritos_list, name='favoritos_list'),
    path('favoritos/add/', auth_views.favoritos_add, name='favoritos_add'),
    path('favoritos/<int:fav_codi>/', auth_views.favoritos_remove, name='favoritos_remove'),
    

    # ============================================================================
    # CARRITO
    # ============================================================================
    path('carrito/', auth_views.carrito_list, name='carrito_list'),
    path('carrito/add/', auth_views.carrito_add, name='carrito_add'),
    path('carrito/update/', auth_views.carrito_update, name='carrito_update'),
    path('carrito/remove/', auth_views.carrito_remove, name='carrito_remove'),
    path('carrito/clear/', auth_views.carrito_clear, name='carrito_clear'),
    

    # ============================================================================
    # PEDIDOS
    # ============================================================================
    path('pedidos/', auth_views.pedidos_list, name='pedidos_list'),
    path('pedidos/crear/', auth_views.crear_pedido, name='crear_pedido'),
    path('pedidos/<int:ped_codi>/', auth_views.obtener_pedido, name='obtener_pedido'),
    path('pedidos/<int:ped_codi>/editar/', auth_views.editar_pedido, name='editar_pedido'),
    path('pedidos/<int:ped_codi>/eliminar/', auth_views.eliminar_pedido, name='eliminar_pedido'),
    path('pedidos/marcar-pagado/', auth_views.marcar_pedido_pagado, name='marcar_pedido_pagado'),
    path('pedidos/export/', auth_views.pedidos_export, name='pedidos_export'),
    

    # ============================================================================
    # EXPORTACIÓN A FORMATO DBF (Base de Datos Fox)
    # ============================================================================
    path('pedidos/export_dbf/', auth_views.pedidos_export_dbf),
    path('pedidos/confirmar_export_dbf/', auth_views.confirmar_export_dbf),
    path('articulos/export_dbf/', auth_views.articulos_export_dbf),
    path('articulos/confirmar_export_dbf/', auth_views.confirmar_articulos_export_dbf),
    path('clientes/export_dbf/', auth_views.clientes_export_dbf),
    path('clientes/confirmar_export_dbf/', auth_views.confirmar_clientes_export_dbf),
    

    # ============================================================================
    # MERCADO PAGO (Pagos Online)
    # ============================================================================
    path('mercado-pago/create-preference/', auth_views.mercado_pago_create_preference, name='mercado_pago_create_preference'),
    path('mercado-pago/webhook/', auth_views.mercado_pago_webhook, name='mercado_pago_webhook'),
    path('mercado-pago/payment-status/', auth_views.mercado_pago_payment_status, name='mercado_pago_payment_status'),
    

    # ============================================================================
    # TRANSFERENCIA BANCARIA
    # ============================================================================
    path('transfer/bank-data/', auth_views.get_bank_data_endpoint, name='get_bank_data'),
    

    # ============================================================================
    # ARTÍCULOS / PRODUCTOS
    # ============================================================================
    # Rutas de verificación de precios comentadas (ya no se usan)
    # path('articulos/verificar-precios/', views.verificar_precios, name='verificar_precios'),
    # path('articulos/verify_prices/', views.articulos_verify_prices, name='articulos_verify_prices'),
    path('articulos/<int:pk>/', views.articulo_detail, name='articulo_detail'),
    path('articulos/', views.articulos_list, name='articulos_list'),
    
    # ============================================================================
    # FILTROS (MARCAS Y RUBROS)
    # ============================================================================
    path('marcas/', views.marcas_list, name='marcas_list'),
    path('rubros/', views.rubros_list, name='rubros_list'),
    
    # ============================================================================
    # CUENTAS BANCARIAS (TRANSFERENCIAS)
    # ============================================================================
    path('cuentas-bancarias/', views.cuentas_bancarias_list, name='cuentas_bancarias_list'),
    

    # ============================================================================
    # VENDEDOR / SUPERVISOR (Sistema de impersonación)
    # ============================================================================
    path('vendedor/login/', vendedor_views.vendedor_login, name='vendedor_login'),
    path('vendedor/me/', vendedor_views.vendedor_me, name='vendedor_me'),
    path('vendedor/logout/', vendedor_views.vendedor_logout, name='vendedor_logout'),
    path('vendedor/clientes/', vendedor_views.vendedor_clientes, name='vendedor_clientes'),
    path('vendedor/impersonate/', vendedor_views.vendedor_impersonate, name='vendedor_impersonate'),
    path('vendedor/stop-impersonation/', vendedor_views.vendedor_stop_impersonation, name='vendedor_stop_impersonation'),
    path('vendedor/check-impersonation/', vendedor_views.check_impersonation, name='check_impersonation'),
    path('vendedor/reset-password/', vendedor_views.vendedor_reset_password, name='vendedor_reset_password'),  # TEMPORAL

]
