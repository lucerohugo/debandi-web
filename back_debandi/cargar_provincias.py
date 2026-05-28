"""
Script para cargar provincias desde archivo DBF (PCIA.DBF)

Campos utilizados del DBF:
- PCI_CODI
- PCI_NOMB
"""

import os
import sys
import django
from pathlib import Path

# ============================================
# CONFIGURAR DJANGO
# ============================================

sys.path.insert(0, str(Path(__file__).parent))

os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    'config.settings'
)

django.setup()

from gestion.models import Provincia
from django.db import transaction

try:
    from dbfread import DBF

except ImportError:
    print("❌ Error: falta instalar dbfread")
    print("Ejecuta:")
    print("pip install dbfread")
    sys.exit(1)


def cargar_provincias(ruta_dbf):

    if not os.path.exists(ruta_dbf):
        print(f"❌ Archivo no encontrado: {ruta_dbf}")
        return False

    print(f"📂 Leyendo archivo: {ruta_dbf}")

    try:
        dbf = DBF(ruta_dbf, encoding='latin1')
        registros = list(dbf)

        print(f"📊 Total registros DBF: {len(registros)}")

        if not registros:
            print("⚠️ El archivo está vacío")
            return False

        # Mostrar campos detectados
        print(f"📋 Campos detectados: {list(registros[0].keys())}")

        creadas = 0
        actualizadas = 0
        errores = 0

        print("\n🔄 Iniciando carga...")
        print("-" * 80)

        with transaction.atomic():

            for idx, registro in enumerate(registros, 1):

                try:

                    # =====================================
                    # LEER DATOS
                    # =====================================

                    pci_codi = (
                        int(registro['PCI_CODI'])
                        if registro['PCI_CODI'] not in [None, '']
                        else None
                    )

                    pci_nomb = (
                        str(registro['PCI_NOMB']).strip()
                        if registro['PCI_NOMB']
                        else ''
                    )

                    # =====================================
                    # VALIDACIONES
                    # =====================================

                    if not pci_codi or not pci_nomb:

                        print(
                            f"⚠️ [{idx}] "
                            f"Datos incompletos"
                        )

                        errores += 1
                        continue

                    # =====================================
                    # CREAR / ACTUALIZAR
                    # =====================================

                    provincia, created = Provincia.objects.update_or_create(
                        pci_codi=pci_codi,
                        defaults={
                            'pci_nomb': pci_nomb
                        }
                    )

                    if created:
                        creadas += 1
                        estado = "✅ CREADA"

                    else:
                        actualizadas += 1
                        estado = "🔄 ACTUALIZADA"

                    print(
                        f"[{idx}/{len(registros)}] "
                        f"{estado}: "
                        f"{pci_nomb} ({pci_codi})"
                    )

                except Exception as e:

                    errores += 1

                    print(
                        f"❌ [{idx}] Error: {str(e)}"
                    )

        # =====================================
        # RESUMEN
        # =====================================

        print("\n" + "=" * 80)
        print("📋 RESUMEN")
        print("=" * 80)
        print(f"✅ Creadas:      {creadas}")
        print(f"🔄 Actualizadas: {actualizadas}")
        print(f"❌ Errores:      {errores}")
        print(
            f"📊 Total: "
            f"{creadas + actualizadas + errores}/{len(registros)}"
        )
        print("=" * 80)

        if creadas + actualizadas > 0:
            print("\n✨ Provincias cargadas correctamente")
            return True

        else:
            print("\n⚠️ No se cargó ninguna provincia")
            return False

    except Exception as e:

        print(f"❌ Error leyendo DBF: {str(e)}")
        return False


def main():

    # =====================================
    # RUTA DBF
    # back_debandi/dbf/PCIA.DBF
    # =====================================

    ruta_dbf = os.path.join(
        os.path.dirname(__file__),
        'dbf',
        'PCIA.DBF'
    )

    # Permitir pasar ruta manual
    if len(sys.argv) > 1:
        ruta_dbf = sys.argv[1]

    print("🚀 Script carga de Provincias")
    print(
        f"📍 Django Settings: "
        f"{os.environ.get('DJANGO_SETTINGS_MODULE')}"
    )
    print()

    resultado = cargar_provincias(ruta_dbf)

    if resultado:
        print("\n✅ Proceso completado")

    else:
        print("\n❌ El proceso falló")

    sys.exit(0 if resultado else 1)


if __name__ == '__main__':
    main()