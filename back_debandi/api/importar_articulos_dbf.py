import requests
import dbf
import os
from decimal import Decimal

# ============================================================
# CONFIGURACIÓN
# ============================================================

API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000/api')
API_EXPORT_URL = f"{API_BASE_URL}/articulos/export_dbf/"
API_CONFIRM_URL = f"{API_BASE_URL}/articulos/confirmar_export_dbf/"

RUTA_ARTIWEB = "ARTWEB.DBF"

# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def articulo_ya_existe(table, artw_codi):
    """
    Verifica si el artículo ya existe en el DBF
    Evita duplicados SI O SI
    """
    for rec in table:
        if rec["ARTW_CODI"] == artw_codi:
            return True
    return False


# ============================================================
# FUNCIÓN PRINCIPAL
# ============================================================

def importar_articulos_dbf():
    print("Consultando API de artículos...")

    # ========================================================
    # 1) OBTENER ARTÍCULOS DEL BACKEND
    # ========================================================
    try:
        response = requests.get(API_EXPORT_URL, timeout=30)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"❌ Error consultando API: {e}")
        return

    articulos = data.get("articulos", [])

    if not articulos:
        print("No hay artículos nuevos para exportar")
        return

    # ========================================================
    # 2) ABRIR DBF
    # ========================================================
    try:
        table = dbf.Table(RUTA_ARTIWEB)
        table.open(mode=dbf.READ_WRITE)
    except Exception as e:
        print(f"❌ No se pudo abrir ARTIWEB.DBF: {e}")
        return

    print(f"Importando {len(articulos)} artículos en ARTWEB.DBF")

    articulos_exportados = []

    # ========================================================
    # 3) ITERAR ARTÍCULOS
    # ========================================================
    for art in articulos:
        try:
            artw_codi = int(art.get("art_codi"))

            # ------------------------------------------------
            # CONTROL CLAVE: NO DUPLICAR
            # ------------------------------------------------
            if articulo_ya_existe(table, artw_codi):
                print(f"Artículo {artw_codi} ya existe → se omite")
                articulos_exportados.append(artw_codi)
                continue

            artw_nomb = str(art.get("art_nomb", "")).strip()[:100]
            artw_pnet = Decimal(art.get("art_pnet", "0"))
            artw_pfin = Decimal(art.get("art_pfin", "0"))
            artw_tiva = str(art.get("art_tiva", "")).strip()[:5]

            # ------------------------------------------------
            # INSERT DBF
            # ------------------------------------------------
            table.append((
                artw_codi,
                artw_nomb,
                artw_pnet,
                artw_pfin,
                artw_tiva
            ))

            articulos_exportados.append(artw_codi)
            print(f"✅ Artículo {artw_codi} exportado correctamente")

        except Exception as e:
            print(f"❌ Error exportando artículo {art.get('art_codi')}: {e}")
            continue

    table.close()

    # ========================================================
    # 4) CONFIRMAR EXPORTACIÓN EN DJANGO
    # ========================================================
    if articulos_exportados:
        try:
            print("Confirmando exportación en backend...")
            r = requests.post(
                API_CONFIRM_URL,
                json={"articulos": articulos_exportados},
                timeout=30
            )
            r.raise_for_status()
            print("Backend actualizado:")
        except Exception as e:
            print("❌ ERROR confirmando exportación")
            print("NO vuelvas a ejecutar el script hasta revisar esto")
            print(e)

    print("Proceso finalizado correctamente")


# ============================================================
# EJECUCIÓN
# ============================================================

if __name__ == "__main__":
    importar_articulos_dbf()


# Ejecutar con:
# python importar_articulos_dbf.py
# El .DBF y .CDX deben estar en la misma carpeta que este script
