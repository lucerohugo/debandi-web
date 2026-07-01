"""
Script para regenerar art_cn para todos los artículos
Ejecutar con: python manage.py shell < regenerate_art_cn.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gestion.models import Articulo

# Actualizar todos los artículos
updated_count = 0
for articulo in Articulo.objects.all():
    new_art_cn = f"DD{str(articulo.art_codi).zfill(5)}"
    if articulo.art_cn != new_art_cn:
        articulo.art_cn = new_art_cn
        articulo.save()
        updated_count += 1
        print(f"Actualizado: {articulo.art_codi} -> {new_art_cn}")

print(f"\nTotal actualizado: {updated_count} artículos")
