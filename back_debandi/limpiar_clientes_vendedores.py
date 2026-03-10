#!/usr/bin/env python
"""
Script para limpiar tablas de Clientes y Vendedores
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gestion.models import Clientes, Vendedor

if __name__ == '__main__':
    print("\n" + "="*60)
    print("LIMPIADOR DE CLIENTES Y VENDEDORES")
    print("="*60)
    
    # Contar antes de limpiar
    clientes_count = Clientes.objects.count()
    vendedores_count = Vendedor.objects.count()
    
    print(f"\n📊 Registros actuales:")
    print(f"  • Clientes: {clientes_count}")
    print(f"  • Vendedores: {vendedores_count}")
    
    respuesta = input("\n⚠️  ¿Deseas limpiar estas tablas? (s/n): ").lower()
    
    if respuesta == 's':
        try:
            # Primero eliminar Clientes (tiene FK a Vendedor)
            eliminados_clientes = Clientes.objects.all().delete()[0]
            print(f"\n✅ Clientes eliminados: {eliminados_clientes}")
            
            # Luego Vendedores
            eliminados_vendedores = Vendedor.objects.all().delete()[0]
            print(f"✅ Vendedores eliminados: {eliminados_vendedores}")
            
            # Verificar que quedaron vacías
            print(f"\n📊 Registros finales:")
            print(f"  • Clientes: {Clientes.objects.count()}")
            print(f"  • Vendedores: {Vendedor.objects.count()}")
            
        except Exception as e:
            print(f"\n❌ Error al limpiar: {e}")
    else:
        print("\n❌ Operación cancelada")
    
    print("="*60 + "\n")
