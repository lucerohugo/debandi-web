#!/usr/bin/env python
"""
Script para rehashear contraseñas de usuarios existentes
Esto es necesario después de cambiar el sistema de hash de contraseñas
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gestion.models import Clientes
from django.contrib.auth.hashers import make_password

def rehash_passwords():
    """
    Re-hashear todas las contraseñas de usuarios existentes
    """
    # Buscar todos los clientes que tengan contraseña
    clientes = Clientes.objects.filter(cli_pswd__isnull=False).exclude(cli_pswd='')
    
    print(f"Encontrados {clientes.count()} usuarios con contraseña")
    
    if clientes.count() == 0:
        print("No hay usuarios para actualizar")
        return
    
    # Nota: No podemos rehashear directamente porque no tenemos las contraseñas en texto plano
    # Las contraseñas ya están hasheadas, así que no es posible actualizarlas automáticamente
    print("\n⚠️  ADVERTENCIA:")
    print("No es posible rehashear las contraseñas existentes porque están en texto hasheado.")
    print("Los usuarios antiguos necesitarán usar 'Recuperar contraseña' para crear una nueva.")
    print("\nSoluciones:")
    print("1. Los usuarios pueden usar el formulario de 'Recuperar contraseña'")
    print("2. Un administrador puede crear nuevas contraseñas para los usuarios")
    print("3. Eliminar los usuarios antiguos y registrarse nuevamente")

if __name__ == '__main__':
    rehash_passwords()
