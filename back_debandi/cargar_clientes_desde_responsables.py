#!/usr/bin/env python
"""
Script para cargar clientes desde Excel de responsables (0150_responsables_481715.xlsx)
Solo carga registros donde TipoCliente = "Cliente"
Crea vendedores simples asociados a cada cliente
"""
import os
import django
import pandas as pd
from datetime import datetime

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gestion.models import Clientes, Vendedor, Provincia, Localidad

def obtener_o_crear_localidad(nombre_localidad, nombre_provincia=None):
    """
    Obtiene una localidad existente o la crea si no existe.
    Si se proporciona provincia, se intenta asociar.
    """
    if not nombre_localidad or not str(nombre_localidad).strip():
        return None
    
    nombre_localidad = str(nombre_localidad).strip()
    
    try:
        # Buscar por nombre exacto primero
        loc = Localidad.objects.filter(loc_nomb__iexact=nombre_localidad).first()
        if loc:
            return loc
        
        # Si no existe y se proporciona provincia, crear localidad
        if nombre_provincia:
            prov = Provincia.objects.filter(pci_nomb__icontains=nombre_provincia).first()
            if prov:
                # Crear localidad por defecto en zona 1 (si existe)
                from gestion.models import Zona
                zona = Zona.objects.first()
                if zona:
                    loc, created = Localidad.objects.get_or_create(
                        loc_nomb=nombre_localidad,
                        defaults={
                            'pci_codi': prov,
                            'zon_codi': zona,
                        }
                    )
                    if created:
                        print(f"    ✅ Localidad creada: {nombre_localidad}")
                    return loc
        
        return None
    except Exception as e:
        print(f"    ⚠️  Error obteniendo/creando localidad: {e}")
        return None


def cargar_clientes():
    """Cargar clientes desde Excel de responsables"""
    archivo = 'import_data/files/0150_responsables_481715.xlsx'
    
    if not os.path.exists(archivo):
        print(f"❌ Archivo no encontrado: {archivo}")
        return 0, 0
    
    print(f"\n📋 Leyendo: {archivo}")
    df = pd.read_excel(archivo)
    
    # Mostrar columnas disponibles
    print(f"Columnas encontradas: {list(df.columns)}")
    
    # Verificar qué valores tiene TipoCliente
    if 'TipoCliente' in df.columns:
        valores_tipo = df['TipoCliente'].unique()
        print(f"\n🔍 Valores únicos en TipoCliente: {valores_tipo}")
        print(f"   Total de filas: {len(df)}")
    else:
        print(f"\n⚠️  Columna 'TipoCliente' no encontrada!")
        print(f"Columnas disponibles: {list(df.columns)}")
        return 0, 0
    
    cargados = 0
    actualizados = 0
    saltados = 0
    
    for _, row in df.iterrows():
        try:
            # Filtro: Solo clientes
            tipo_cliente = str(row.get('TipoCliente', '')).strip()
            if tipo_cliente.upper() != 'CLIENTE':
                saltados += 1
                continue
            
            # Mapeo de campos
            cli_nomb = str(row.get('Razonsocial', row.get('Nombre', ''))).strip()
            cli_doc = str(row.get('Documento', '')).strip() or None
            cli_dire = str(row.get('Domicilio', '')).strip() or None
            cli_bar = str(row.get('Barrio', '')).strip() or None
            cli_tele = str(row.get('Telefono', '')).strip() or None
            cli_emai = str(row.get('Email', '')).strip() or None
            cli_cuit = str(row.get('Cuit', '')).strip() or None
            
            if not cli_nomb:
                print(f"  ⚠️  Fila sin nombre, saltando...")
                saltados += 1
                continue
            
            # Obtener/crear localidad
            nombre_localidad = str(row.get('Localidad', '')).strip()
            nombre_provincia = str(row.get('Provincia', '')).strip()
            loc_codi = obtener_o_crear_localidad(nombre_localidad, nombre_provincia)
            
            if not loc_codi:
                print(f"  ⚠️  No se pudo obtener localidad para {cli_nomb}, saltando...")
                saltados += 1
                continue
            
            # Crear o actualizar cliente
            created = False
            cliente = None
            
            # Si hay documento, usar update_or_create
            if cli_doc:
                cliente, created = Clientes.objects.update_or_create(
                    cli_doc=cli_doc,
                    defaults={
                        'cli_nomb': cli_nomb,
                        'cli_dire': cli_dire or '',
                        'cli_bar': cli_bar or '',
                        'cli_tele': cli_tele or '',
                        'cli_emai': cli_emai or None,
                        'cli_cuit': cli_cuit or None,
                        'loc_codi': loc_codi,
                    }
                )
            else:
                # Si no hay documento, buscar por email o CUIT, si no existe crear
                if cli_emai:
                    cliente, created = Clientes.objects.update_or_create(
                        cli_emai=cli_emai,
                        defaults={
                            'cli_nomb': cli_nomb,
                            'cli_dire': cli_dire or '',
                            'cli_bar': cli_bar or '',
                            'cli_tele': cli_tele or '',
                            'cli_cuit': cli_cuit or None,
                            'loc_codi': loc_codi,
                            'cli_doc': cli_doc,
                        }
                    )
                elif cli_cuit:
                    cliente, created = Clientes.objects.update_or_create(
                        cli_cuit=cli_cuit,
                        defaults={
                            'cli_nomb': cli_nomb,
                            'cli_dire': cli_dire or '',
                            'cli_bar': cli_bar or '',
                            'cli_tele': cli_tele or '',
                            'cli_emai': cli_emai or None,
                            'loc_codi': loc_codi,
                            'cli_doc': cli_doc,
                        }
                    )
                else:
                    # Crear cliente solo con nombre (último recurso)
                    cliente = Clientes.objects.create(
                        cli_nomb=cli_nomb,
                        cli_dire=cli_dire or '',
                        cli_bar=cli_bar or '',
                        cli_tele=cli_tele or '',
                        cli_emai=cli_emai or None,
                        cli_cuit=cli_cuit or None,
                        cli_doc=cli_doc,
                        loc_codi=loc_codi,
                    )
                    created = True
            
            if created:
                cargados += 1
                print(f"  ✅ Cliente creado: {cli_nomb}")
            else:
                actualizados += 1
                print(f"  ♻️  Cliente actualizado: {cli_nomb}")
            
            # Crear o asociar vendedor
            if cliente:
                ven_doc = cli_doc if cli_doc else f"CLI-{cliente.cli_codi}"
                vendedor, ven_created = Vendedor.objects.get_or_create(
                    ven_doc=ven_doc,
                    defaults={
                        'ven_nomb': cli_nomb,
                        'ven_tele': cli_tele or None,
                        'ven_emai': cli_emai or None,
                        'loc_codi': loc_codi,
                    }
                )
                if ven_created:
                    print(f"      └─ Vendedor creado: {vendedor.ven_nomb}")
                
                # Asociar vendedor al cliente si no está asociado
                if not cliente.ven_codi:
                    cliente.ven_codi = vendedor
                    cliente.save()
                    print(f"      └─ Vendedor asociado al cliente")
                elif cliente.ven_codi.ven_codi != vendedor.ven_codi:
                    cliente.ven_codi = vendedor
                    cliente.save()
                    print(f"      └─ Vendedor reasociado")
                
        except Exception as e:
            print(f"  ❌ Error procesando fila: {e}")
            saltados += 1
            continue
    
    return cargados, actualizados, saltados


if __name__ == '__main__':
    print("\n" + "="*60)
    print("CARGADOR DE CLIENTES DESDE RESPONSABLES")
    print("="*60)
    
    cargados, actualizados, saltados = cargar_clientes()
    
    print("\n" + "="*60)
    print(f"📊 RESUMEN:")
    print(f"  ✅ Clientes creados: {cargados}")
    print(f"  ♻️  Clientes actualizados: {actualizados}")
    print(f"  ⏭️  Registros saltados (no son clientes): {saltados}")
    print("="*60 + "\n")
