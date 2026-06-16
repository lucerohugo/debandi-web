#!/usr/bin/env python
# Script para agregar el modelo NovedadPublicacion

import os
import sys

# Ruta del archivo de modelos
ruta_modelos = 'back_debandi/gestion/models.py'

# Leer el archivo
with open(ruta_modelos, 'r', encoding='utf-8') as f:
    contenido = f.read()

# Verificar si el modelo ya existe
if 'class NovedadPublicacion' in contenido:
    print('✗ El modelo NovedadPublicacion ya existe')
    sys.exit(0)

# El nuevo modelo a insertar
nuevo_modelo = '''
class NovedadPublicacion(models.Model):
    """Tarjetas de novedades/promociones que se muestran en la página de Novedades"""
    CATEGORIAS = [
        ('nuevos_ingresos', 'Nuevos Ingresos'),
        ('promocion', 'Promoción'),
        ('oferta', 'Oferta'),
        ('otro', 'Otro'),
    ]
    
    npu_codi = models.AutoField(primary_key=True)
    npu_titl = models.CharField(max_length=255, help_text="Título de la novedad")
    npu_desc = models.TextField(help_text="Descripción de la novedad")
    npu_img = models.ImageField(upload_to='novedades/', help_text="Imagen de la tarjeta")
    npu_cate = models.CharField(max_length=50, choices=CATEGORIAS, default='nuevos_ingresos')
    npu_fech = models.DateField(help_text="Fecha de la novedad")
    npu_acti = models.BooleanField(default=True, help_text="¿Mostrar esta novedad?")
    npu_fcre = models.DateTimeField(auto_now_add=True, editable=False)
    npu_fmod = models.DateTimeField(auto_now=True, editable=False)

    class Meta:
        verbose_name = "Novedad Publicación"
        verbose_name_plural = "Novedades Publicaciones"
        ordering = ["-npu_fech"]

    def __str__(self):
        return self.npu_titl


'''

# Encontrar la posición donde insertar (antes de "class Registro")
pos = contenido.find('class Registro(models.Model):')

if pos == -1:
    print('✗ No se encontró class Registro')
    sys.exit(1)

# Insertar el modelo
contenido_nuevo = contenido[:pos] + nuevo_modelo + contenido[pos:]

# Guardar el archivo actualizado
with open(ruta_modelos, 'w', encoding='utf-8') as f:
    f.write(contenido_nuevo)

print('✓ Modelo NovedadPublicacion agregado correctamente')
