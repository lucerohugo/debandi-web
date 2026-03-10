#!/usr/bin/env python
"""
Script para cargar vendedores y responsables desde Excel a Vendedor
"""
import os
import django
import pandas as pd
from datetime import datetime

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gestion.models import Vendedor, Localidad

def cargar_vendedores():
    """Cargar vendedores desde Excel"""
    archivo = 'import_data/files/0150_vendedores_610007.xlsx'
    
    if not os.path.exists(archivo):
        print(f"❌ Archivo no encontrado: {archivo}")
        return 0, 0
    
    print(f"\n📋 Leyendo: {archivo}")
    df = pd.read_excel(archivo)
    
    # Mostrar columnas disponibles para verificar
    print(f"Columnas encontradas: {list(df.columns)}")
    
    cargados = 0
    actualizados = 0
    
    for _, row in df.iterrows():
        try:
            # Mapeo de columnas: Excel → Modelo
            ven_nomb = str(row.get('RazonSocial', '')).strip()
            ven_doc = str(row.get('Documento', '')).strip() or str(row.get('Vendedor', '')).strip()
            
            if not ven_nomb or not ven_doc:
                continue
            
            # Obtener localidad si existe
            loc_codi = None
            if pd.notna(row.get('Localidad')):
                try:
                    loc_nombre = str(row['Localidad']).strip()
                    # Buscar por nombre de localidad
                    loc = Localidad.objects.filter(loc_nomb__icontains=loc_nombre).first()
                    if loc:
                        loc_codi = loc
                except:
                    pass
            
            # Crear o actualizar
            vendedor, created = Vendedor.objects.update_or_create(
                ven_doc=ven_doc,
                defaults={
                    'ven_nomb': ven_nomb,
                    'ven_fnac': pd.to_datetime(row.get('FechaNacimiento'), errors='coerce') if pd.notna(row.get('FechaNacimiento')) else None,
                    'ven_emai': str(row.get('Email', '')).strip() or None,
                    'ven_tele': str(row.get('TelefonoCelular', row.get('Telefono', ''))).strip() or None,
                    'loc_codi': loc_codi,
                }
            )
            
            if created:
                cargados += 1
                print(f"  ✅ Vendedor creado: {ven_nomb}")
            else:
                actualizados += 1
                print(f"  ♻️  Vendedor actualizado: {ven_nomb}")
                
        except Exception as e:
            print(f"  ❌ Error procesando fila: {e}")
            continue
    
    return cargados, actualizados


def cargar_responsables():
    """Cargar responsables desde Excel"""
    archivo = 'import_data/files/0150_responsables_481715.xlsx'
    
    if not os.path.exists(archivo):
        print(f"❌ Archivo no encontrado: {archivo}")
        return 0, 0
    
    print(f"\n📋 Leyendo: {archivo}")
    df = pd.read_excel(archivo)
    
    # Mostrar columnas disponibles para verificar
    print(f"Columnas encontradas: {list(df.columns)}")
    
    cargados = 0
    actualizados = 0
    
    for _, row in df.iterrows():
        try:
            # Mapeo de columnas: Excel → Modelo
            ven_nomb = str(row.get('Nombre', row.get('Razonsocial', ''))).strip()
            ven_doc = str(row.get('Documento', '')).strip() or str(row.get('Responsable', '')).strip()
            
            if not ven_nomb or not ven_doc:
                continue
            
            # Obtener localidad si existe
            loc_codi = None
            if pd.notna(row.get('Localidad')):
                try:
                    loc_nombre = str(row['Localidad']).strip()
                    # Buscar por nombre de localidad
                    loc = Localidad.objects.filter(loc_nomb__icontains=loc_nombre).first()
                    if loc:
                        loc_codi = loc
                except:
                    pass
            
            # Crear o actualizar
            vendedor, created = Vendedor.objects.update_or_create(
                ven_doc=ven_doc,
                defaults={
                    'ven_nomb': ven_nomb,
                    'ven_fnac': pd.to_datetime(row.get('FechaNacimiento'), errors='coerce') if pd.notna(row.get('FechaNacimiento')) else None,
                    'ven_emai': str(row.get('Email', '')).strip() or None,
                    'ven_tele': str(row.get('TelefonoCelular', row.get('Telefono', ''))).strip() or None,
                    'loc_codi': loc_codi,
                }
            )
            
            if created:
                cargados += 1
                print(f"  ✅ Responsable creado: {ven_nomb}")
            else:
                actualizados += 1
                print(f"  ♻️  Responsable actualizado: {ven_nomb}")
                
        except Exception as e:
            print(f"  ❌ Error procesando fila: {e}")
            continue
    
    return cargados, actualizados


def main():
    print("\n" + "="*80)
    print("CARGANDO VENDEDORES Y RESPONSABLES")
    print("="*80)
    
    # Cargar vendedores
    print("\n📦 VENDEDORES")
    print("-" * 80)
    vend_cargados, vend_actualizados = cargar_vendedores()
    
    # Cargar responsables
    print("\n📦 RESPONSABLES")
    print("-" * 80)
    resp_cargados, resp_actualizados = cargar_responsables()
    
    # Resumen
    print("\n" + "="*80)
    print("RESUMEN DE CARGA")
    print("="*80)
    print(f"✅ Vendedores cargados: {vend_cargados}")
    print(f"♻️  Vendedores actualizados: {vend_actualizados}")
    print(f"✅ Responsables cargados: {resp_cargados}")
    print(f"♻️  Responsables actualizados: {resp_actualizados}")
    
    # Total en BD
    total_legajos = LegajoPersonal.objects.count()
    vendedores = LegajoPersonal.objects.filter(per_tipo='VENDEDOR').count()
    responsables = LegajoPersonal.objects.filter(per_tipo='RESPONSABLE').count()
    
    print(f"\n📊 Total en BD:")
    print(f"  - Total Legajos: {total_legajos}")
    print(f"  - Vendedores: {vendedores}")
    print(f"  - Responsables: {responsables}")
    
    print("\n" + "="*80)


if __name__ == '__main__':
    main()
