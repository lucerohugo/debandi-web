#!/usr/bin/env python
"""
Script para cargar clientes desde Excel de responsables (0150_responsables_481715.xlsx)
Solo carga registros donde TipoCliente = "Cliente"
"""
import os
import django
import pandas as pd

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gestion.models import Clientes, Vendedor, Localidad

def cargar_clientes():
    """Cargar clientes desde Excel de responsables"""
    archivo = 'import_data/files/0150_responsables_481715.xlsx'
    
    if not os.path.exists(archivo):
        print(f"❌ Archivo no encontrado: {archivo}")
        return 0, 0, 0
    
    print(f"\n📋 Leyendo: {archivo}")
    df = pd.read_excel(archivo)
    
    print(f"Total de filas en Excel: {len(df)}")
    
    # Filtrar SOLO por TipoCliente = "Cliente"
    df_clientes = df[df['TipoCliente'].str.strip() == 'Cliente'].copy()
    print(f"Registros con TipoCliente='Cliente': {len(df_clientes)}")
    
    cargados = 0
    actualizados = 0
    saltados = 0
    
    # Localidad por defecto
    loc_default = Localidad.objects.first()
    
    print(f"\n📥 Procesando {len(df_clientes)} clientes...\n")
    
    for idx, row in df_clientes.iterrows():
        try:
            # Campos obligatorios/principales
            cli_nomb = str(row.get('Razonsocial', row.get('Nombre', ''))).strip()
            if not cli_nomb:
                saltados += 1
                continue
            
            # Campos opcionales
            cli_doc = str(row.get('Documento', '')).strip() or None
            cli_dire = str(row.get('Domicilio', '')).strip() or ''
            cli_bar = str(row.get('Barrio', '')).strip() or ''
            cli_tele = str(row.get('Telefono', '')).strip() or ''
            cli_emai = str(row.get('Email', '')).strip() or None
            cli_cuit = str(row.get('Cuit', '')).strip() or None
            
            # Verificar si el email ya existe - si existe, NO lo asignamos (pero seguimos creando el cliente)
            if cli_emai:
                email_existe = Clientes.objects.filter(cli_emai=cli_emai).exists()
                if email_existe:
                    cli_emai = None  # No asignar email duplicado, pero continuar con el cliente
            
            # Localidad (usar default si no existe)
            loc_codi = loc_default
            
            # Buscar cliente SOLO por documento (menos riesgo de duplicados)
            cliente = None
            
            # SOLO buscar si tiene documento válido
            if cli_doc and cli_doc.strip():
                cliente = Clientes.objects.filter(cli_doc=cli_doc).first()
            
            # Si tiene documento y lo encontró, ACTUALIZAR
            if cliente:
                cliente.cli_nomb = cli_nomb
                cliente.cli_dire = cli_dire
                cliente.cli_bar = cli_bar
                cliente.cli_tele = cli_tele
                if cli_emai and not cliente.cli_emai:
                    cliente.cli_emai = cli_emai
                if cli_cuit and not cliente.cli_cuit:
                    cliente.cli_cuit = cli_cuit
                cliente.loc_codi = loc_codi
                cliente.save()
                actualizados += 1
            else:
                # NO tiene documento, o no lo encontró → CREAR NUEVO SIEMPRE
                cliente = Clientes.objects.create(
                    cli_nomb=cli_nomb,
                    cli_dire=cli_dire,
                    cli_bar=cli_bar,
                    cli_tele=cli_tele,
                    cli_emai=cli_emai if cli_emai else None,
                    cli_cuit=cli_cuit if cli_cuit else None,
                    cli_doc=cli_doc if cli_doc else None,
                    loc_codi=loc_codi,
                )
                cargados += 1
            
            # Crear/asociar vendedor - SOLO con nombre
            ven_doc = cli_doc if cli_doc else f"CLI-{cliente.cli_codi}"
            vendedor, _ = Vendedor.objects.get_or_create(
                ven_doc=ven_doc,
                defaults={
                    'ven_nomb': cli_nomb,  # Solo nombre, nada más
                }
            )
            
            # Asociar
            if not cliente.ven_codi or cliente.ven_codi.ven_codi != vendedor.ven_codi:
                cliente.ven_codi = vendedor
                cliente.save()
            
            if cargados > 0 and (cargados + actualizados) % 100 == 0:
                print(f"  Procesados: {cargados + actualizados}")
                
        except Exception as e:
            print(f"  ❌ Fila {idx}: {e}")
            saltados += 1
            continue
    
    return cargados, actualizados, saltados


if __name__ == '__main__':
    print("="*60)
    print("CARGADOR DE CLIENTES DESDE RESPONSABLES (SOLO CLIENTES)")
    print("="*60)
    
    cargados, actualizados, saltados = cargar_clientes()
    
    print("\n" + "="*60)
    print(f"📊 RESUMEN:")
    print(f"  ✅ Clientes creados: {cargados}")
    print(f"  ♻️  Clientes actualizados: {actualizados}")
    print(f"  ⏭️  Registros con error: {saltados}")
    print(f"  📦 TOTAL PROCESADO: {cargados + actualizados}")
    print("="*60 + "\n")
