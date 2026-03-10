#!/usr/bin/env python
"""
Script para cargar datos de ejemplo en la BD de Django.
Extrae los productos que estaban en el frontend y los inserta en Django.
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Hugo.settings')
django.setup()

from gestion.models import Marca, Rubro, SubRubro, Articulo

def crear_datos():
    """Crea marcas, rubros, subrubros y artículos"""
    
    print("🔄 Limpiando datos anteriores...")
    Articulo.objects.all().delete()
    SubRubro.objects.all().delete()
    Rubro.objects.all().delete()
    Marca.objects.all().delete()
    
    print("✅ Base de datos limpia")
    
    # Crear Marcas
    print("\n📦 Creando Marcas...")
    marcas = {
        'dewalt': Marca.objects.create(mar_nomb='DeWalt'),
        'makita': Marca.objects.create(mar_nomb='Makita'),
        'bosch': Marca.objects.create(mar_nomb='Bosch'),
        'stanley': Marca.objects.create(mar_nomb='Stanley'),
        'estwing': Marca.objects.create(mar_nomb='Estwing'),
        '3m': Marca.objects.create(mar_nomb='3M'),
        'streamlight': Marca.objects.create(mar_nomb='Streamlight'),
        'werner': Marca.objects.create(mar_nomb='Werner'),
        'ansell': Marca.objects.create(mar_nomb='Ansell'),
        'uvex': Marca.objects.create(mar_nomb='Uvex'),
    }
    print(f"✅ {len(marcas)} marcas creadas")
    
    # Crear Rubros
    print("\n📂 Creando Rubros...")
    rubros = {
        'taladros': Rubro.objects.create(rub_nomb='Taladros'),
        'sierras': Rubro.objects.create(rub_nomb='Sierras'),
        'lijadoras': Rubro.objects.create(rub_nomb='Lijadoras'),
        'destornilladores': Rubro.objects.create(rub_nomb='Destornilladores'),
        'herramientas': Rubro.objects.create(rub_nomb='Herramientas Manuales'),
        'seguridad': Rubro.objects.create(rub_nomb='Seguridad'),
        'ferreteria': Rubro.objects.create(rub_nomb='Ferretería'),
        'electricidad': Rubro.objects.create(rub_nomb='Electricidad'),
        'jardin': Rubro.objects.create(rub_nomb='Riego y Jardín'),
    }
    print(f"✅ {len(rubros)} rubros creados")
    
    # Crear SubRubros
    print("\n📋 Creando SubRubros...")
    subrubros = {
        'taladros_electricos': SubRubro.objects.create(sru_nomb='Taladros Eléctricos', rub_codi=rubros['taladros']),
        'sierras_circulares': SubRubro.objects.create(sru_nomb='Sierras Circulares', rub_codi=rubros['sierras']),
        'sierras_alternantes': SubRubro.objects.create(sru_nomb='Sierras Alternantes', rub_codi=rubros['sierras']),
        'lijadoras_orbitales': SubRubro.objects.create(sru_nomb='Lijadoras Orbitales', rub_codi=rubros['lijadoras']),
        'juegos_destornilladores': SubRubro.objects.create(sru_nomb='Juegos Destornilladores', rub_codi=rubros['destornilladores']),
        'martillos': SubRubro.objects.create(sru_nomb='Martillos', rub_codi=rubros['herramientas']),
        'cascos': SubRubro.objects.create(sru_nomb='Cascos de Seguridad', rub_codi=rubros['seguridad']),
        'guantes': SubRubro.objects.create(sru_nomb='Guantes', rub_codi=rubros['seguridad']),
        'lentes': SubRubro.objects.create(sru_nomb='Lentes Protectores', rub_codi=rubros['seguridad']),
        'niveles': SubRubro.objects.create(sru_nomb='Niveles Láser', rub_codi=rubros['ferreteria']),
        'linternas': SubRubro.objects.create(sru_nomb='Linternas LED', rub_codi=rubros['electricidad']),
        'escaleras': SubRubro.objects.create(sru_nomb='Escaleras', rub_codi=rubros['ferreteria']),
        'llaves': SubRubro.objects.create(sru_nomb='Llaves Inglesas', rub_codi=rubros['herramientas']),
        'caladoras': SubRubro.objects.create(sru_nomb='Caladoras', rub_codi=rubros['sierras']),
        'motosierras': SubRubro.objects.create(sru_nomb='Motosierras', rub_codi=rubros['jardin']),
        'compresores': SubRubro.objects.create(sru_nomb='Compresores', rub_codi=rubros['electricidad']),
        'brocas': SubRubro.objects.create(sru_nomb='Brocas', rub_codi=rubros['herramientas']),
        'cinta_metrica': SubRubro.objects.create(sru_nomb='Cintas Métricas', rub_codi=rubros['ferreteria']),
    }
    print(f"✅ {len(subrubros)} subrubros creados")
    
    # Crear Artículos
    print("\n🛠️  Creando Artículos...")
    articulos = [
        {
            'art_nomb': 'Taladro Profesional DeWalt 20V',
            'art_desc': 'Taladro inalámbrico profesional de alto rendimiento',
            'art_pnet': 149.99,
            
            'art_stkp': 50,
            'art_stkmin': 5,
            'mar_codi': marcas['dewalt'],
            'sru_codi': subrubros['taladros_electricos'],
        },
        {
            'art_nomb': 'Sierra Circular Makita 7 1/4"',
            'art_desc': 'Sierra circular de 7 1/4 pulgadas con potencia máxima',
            'art_pnet': 89.99,
            
            'art_stkp': 35,
            'art_stkmin': 5,
            'mar_codi': marcas['makita'],
            'sru_codi': subrubros['sierras_circulares'],
        },
        {
            'art_nomb': 'Lijadora Orbital Bosch 5"',
            'art_desc': 'Lijadora orbital profesional de precisión',
            'art_pnet': 79.99,
            
            'art_stkp': 42,
            'art_stkmin': 5,
            'mar_codi': marcas['bosch'],
            'sru_codi': subrubros['lijadoras_orbitales'],
        },
        {
            'art_nomb': 'Juego 40 Destornilladores',
            'art_desc': 'Set completo de 40 destornilladores profesionales',
            'art_pnet': 34.99,
            
            'art_stkp': 100,
            'art_stkmin': 10,
            'mar_codi': marcas['stanley'],
            'sru_codi': subrubros['juegos_destornilladores'],
        },
        {
            'art_nomb': 'Mazo de Goma 32oz',
            'art_desc': 'Mazo profesional de goma de alta calidad',
            'art_pnet': 15.99,
            
            'art_stkp': 80,
            'art_stkmin': 10,
            'mar_codi': marcas['estwing'],
            'sru_codi': subrubros['martillos'],
        },
        {
            'art_nomb': 'Casco de Seguridad Amarillo',
            'art_desc': 'Casco profesional ANSI certificado',
            'art_pnet': 12.99,
            
            'art_stkp': 200,
            'art_stkmin': 20,
            'mar_codi': marcas['3m'],
            'sru_codi': subrubros['cascos'],
        },
        {
            'art_nomb': 'Martillo Perforador SDS Bosch',
            'art_desc': 'Martillo perforador profesional con sistema SDS',
            'art_pnet': 189.99,
            
            'art_stkp': 28,
            'art_stkmin': 5,
            'mar_codi': marcas['bosch'],
            'sru_codi': subrubros['taladros_electricos'],
        },
        {
            'art_nomb': 'Sierra Alternante DeWalt',
            'art_desc': 'Sierra alternante potente para cortes precisos',
            'art_pnet': 125.99,
            
            'art_stkp': 32,
            'art_stkmin': 5,
            'mar_codi': marcas['dewalt'],
            'sru_codi': subrubros['sierras_alternantes'],
        },
        {
            'art_nomb': 'Motosierra Makita 45cc',
            'art_desc': 'Motosierra de gasolina de alto rendimiento',
            'art_pnet': 329.99,
            
            'art_stkp': 15,
            'art_stkmin': 3,
            'mar_codi': marcas['makita'],
            'sru_codi': subrubros['motosierras'],
        },
        {
            'art_nomb': 'Compresor de Aire Stanley 50L',
            'art_desc': 'Compresor de aire profesional con tanque de 50 litros',
            'art_pnet': 159.99,
            
            'art_stkp': 20,
            'art_stkmin': 3,
            'mar_codi': marcas['stanley'],
            'sru_codi': subrubros['compresores'],
        },
        {
            'art_nomb': 'Juego de Brocas Profesional 101pz',
            'art_desc': 'Set de 101 brocas de acero de alta velocidad',
            'art_pnet': 29.99,
            
            'art_stkp': 120,
            'art_stkmin': 15,
            'mar_codi': marcas['bosch'],
            'sru_codi': subrubros['brocas'],
        },
        {
            'art_nomb': 'Guantes de Trabajo Nitrilo',
            'art_desc': 'Guantes de protección con agarre mejorado',
            'art_pnet': 8.99,
            
            'art_stkp': 500,
            'art_stkmin': 50,
            'mar_codi': marcas['ansell'],
            'sru_codi': subrubros['guantes'],
        },
        {
            'art_nomb': 'Lentes de Seguridad Anti-reflejo',
            'art_desc': 'Lentes protectores con lentes anti-reflejo',
            'art_pnet': 18.99,
            
            'art_stkp': 150,
            'art_stkmin': 15,
            'mar_codi': marcas['uvex'],
            'sru_codi': subrubros['lentes'],
        },
        {
            'art_nomb': 'Nivel Láser Digital Bosch 30m',
            'art_desc': 'Nivel láser digital con alcance de 30 metros',
            'art_pnet': 89.99,
            
            'art_stkp': 45,
            'art_stkmin': 5,
            'mar_codi': marcas['bosch'],
            'sru_codi': subrubros['niveles'],
        },
        {
            'art_nomb': 'Linterna LED Profesional 1000 lum',
            'art_desc': 'Linterna LED de alta potencia 1000 lúmenes',
            'art_pnet': 34.99,
            
            'art_stkp': 80,
            'art_stkmin': 10,
            'mar_codi': marcas['streamlight'],
            'sru_codi': subrubros['linternas'],
        },
        {
            'art_nomb': 'Escalera Telescópica Aluminio 4.7m',
            'art_desc': 'Escalera telescópica de aluminio con estabilizador',
            'art_pnet': 109.99,
            
            'art_stkp': 25,
            'art_stkmin': 3,
            'mar_codi': marcas['werner'],
            'sru_codi': subrubros['escaleras'],
        },
        {
            'art_nomb': 'Llave Inglesa Ajustable',
            'art_desc': 'Llave inglesa de alta calidad 300mm',
            'art_pnet': 14.99,
            
            'art_stkp': 200,
            'art_stkmin': 20,
            'mar_codi': marcas['stanley'],
            'sru_codi': subrubros['llaves'],
        },
        {
            'art_nomb': 'Pistola Caladora Inalámbrica',
            'art_desc': 'Caladora inalámbrica con batería de 20V',
            'art_pnet': 99.99,
            
            'art_stkp': 38,
            'art_stkmin': 5,
            'mar_codi': marcas['dewalt'],
            'sru_codi': subrubros['caladoras'],
        },
        {
            'art_nomb': 'Cinta Métrica de Fibra 10m',
            'art_desc': 'Cinta métrica profesional de 10 metros',
            'art_pnet': 12.99,
            
            'art_stkp': 150,
            'art_stkmin': 15,
            'mar_codi': marcas['stanley'],
            'sru_codi': subrubros['cinta_metrica'],
        },
    ]
    
    count = 0
    for data in articulos:
        articulo = Articulo.objects.create(**data)
        count += 1
        print(f"  ✅ {articulo.art_nomb}")
    
    print(f"\n✅ {count} artículos creados")
    print("\n🎉 ¡Base de datos poblada exitosamente!")

if __name__ == '__main__':
    try:
        crear_datos()
    except Exception as e:
        print(f"❌ Error: {e}")
