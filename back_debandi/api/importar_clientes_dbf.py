import requests
import dbf
import os
from datetime import datetime

# ============================================================
# CONFIGURACIÓN
# ============================================================

API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000/api')
API_EXPORT_URL = f"{API_BASE_URL}/clientes/export_dbf/"
API_CONFIRM_URL = f"{API_BASE_URL}/clientes/confirmar_export_dbf/"

RUTA_CLIWEB = "CLIWEB.DBF"

# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def cliente_ya_existe(table, cliw_codi):
    """
    Verifica si el cliente ya existe en el DBF
    Evita duplicados SI O SI
    """
    for rec in table:
        if rec["CLIW_CODI"] == cliw_codi:
            return True
    return False


# ============================================================
# FUNCIÓN PRINCIPAL
# ============================================================

def importar_clientes_dbf():
    print("Consultando API de clientes...")

    # ========================================================
    # 1) OBTENER CLIENTES DEL BACKEND
    # ========================================================
    try:
        response = requests.get(API_EXPORT_URL, timeout=30)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"❌ Error consultando API: {e}")
        return

    clientes = data.get("clientes", [])

    if not clientes:
        print("No hay clientes nuevos para exportar")
        return

    # ========================================================
    # 2) ABRIR DBF
    # ========================================================
    try:
        table = dbf.Table(RUTA_CLIWEB)
        table.open(mode=dbf.READ_WRITE)
    except Exception as e:
        print(f"❌ No se pudo abrir CLIWEB.DBF: {e}")
        return

    print(f"Importando {len(clientes)} clientes en CLIWEB.DBF")

    clientes_exportados = []

    # ========================================================
    # 3) ITERAR CLIENTES
    # ========================================================
    for cli in clientes:
        try:
            cliw_codi = int(cli.get("cliw_codi"))

            # ------------------------------------------------
            # CONTROL CLAVE: NO DUPLICAR
            # ------------------------------------------------
            if cliente_ya_existe(table, cliw_codi):
                print(f"Cliente {cliw_codi} ya existe → se omite")
                clientes_exportados.append(cliw_codi)
                continue

            cliw_nomb = str(cli.get("cliw_nomb", "")).strip()[:100]
            cliw_loca = int(cli.get("cliw_loca", 0))
            cliw_emai = str(cli.get("cliw_emai", "")).strip()[:100]

            # Fecha registro → YYYYMMDD → date
            freg_str = cli.get("cliw_freg")
            cliw_freg = datetime.strptime(freg_str, "%Y%m%d").date() if freg_str else None

            # ------------------------------------------------
            # INSERT DBF (SIN CLIW_DOC)
            # ------------------------------------------------
            table.append((
                cliw_codi,
                cliw_nomb,
                cliw_loca,
                cliw_freg,
                cliw_emai
            ))

            clientes_exportados.append(cliw_codi)
            print(f"✅ Cliente {cliw_codi} exportado correctamente")

        except Exception as e:
            print(f"❌ Error exportando cliente {cli.get('cliw_codi')}: {e}")
            continue

    table.close()

    # ========================================================
    # 4) CONFIRMAR EXPORTACIÓN EN DJANGO
    # ========================================================
    if clientes_exportados:
        try:
            print("Confirmando exportación en backend...")
            r = requests.post(
                API_CONFIRM_URL,
                json={"clientes": clientes_exportados},
                timeout=30
            )
            r.raise_for_status()
            print("Backend actualizado correctamente")
        except Exception as e:
            print("❌ ERROR confirmando exportación")
            print("NO vuelvas a ejecutar el script hasta revisar esto")
            print(e)

    print("Proceso finalizado correctamente")


# ============================================================
# EJECUCIÓN
# ============================================================

if __name__ == "__main__":
    importar_clientes_dbf()
