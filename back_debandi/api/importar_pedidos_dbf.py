import requests
import dbf
import os
from datetime import datetime

# ============================================================
# CONFIGURACIÓN
# ============================================================

# Usar variable de entorno o fallback a localhost
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000/api')
API_EXPORT_URL = f"{API_BASE_URL}/pedidos/export_dbf/"
API_CONFIRM_URL = f"{API_BASE_URL}/pedidos/confirmar_export_dbf/"
RUTA_PEDIWEB = "PEDIWEB.DBF"

# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def pedido_ya_existe(table, pedw_codi): 
    """
    Verifica si el pedido ya existe en el DBF
    Evita duplicados SI O SI
    """
    for rec in table:
        if rec["PEDW_CODI"] == pedw_codi:
            return True
    return False


# ============================================================
# FUNCIÓN PRINCIPAL
# ============================================================

def importar_pediweb_dbf():
    print("Consultando API de pedidos...")

    # ========================================================
    # 1) OBTENER PEDIDOS DEL BACKEND
    # ========================================================
    try:
        response = requests.get(API_EXPORT_URL, timeout=30)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"❌ Error consultando API: {e}")
        return

    pedidos = data.get("pedidos", [])

    if not pedidos:
        print("No hay pedidos nuevos para exportar")
        return

    # ========================================================
    # 2) ABRIR DBF
    # ========================================================
    try:
        table = dbf.Table(RUTA_PEDIWEB)
        table.open(mode=dbf.READ_WRITE)
    except Exception as e:
        print(f" No se pudo abrir PEDIWEB.DBF: {e}")
        return

    print(f"Importando {len(pedidos)} pedidos en PEDIWEB.DBF")

    pedidos_exportados = []  # ← los que se importan bien

    # ========================================================
    # 3) ITERAR PEDIDOS
    # ========================================================
    for pedido in pedidos:
        try:
            pedw_codi = int(pedido.get("ped_codi"))

            # ------------------------------------------------
            # CONTROL CLAVE: NO DUPLICAR
            # ------------------------------------------------
            if pedido_ya_existe(table, pedw_codi):
                print(f" Pedido {pedw_codi} ya existe en DBF → se omite")
                pedidos_exportados.append(pedw_codi)  # igual lo confirmamos
                continue

            # Fecha
            pedw_wfec = None
            fecha_raw = pedido.get("ped_fech")
            if fecha_raw:
                try:
                    pedw_wfec = datetime.fromisoformat(
                        fecha_raw.replace("Z", "+00:00")
                    ).date()
                except Exception:
                    pass

            # Forma de pago
            pedw_wfpa = str(pedido.get("ped_fpag", "")).strip()[:3]

            # Total
            pedw_wtot = float(pedido.get("ped_tota", 0))

            # ------------------------------------------------
            # INSERT DBF
            # ------------------------------------------------
            table.append((
                pedw_codi,
                pedw_wfec,
                pedw_wfpa,
                pedw_wtot
            ))

            pedidos_exportados.append(pedw_codi)
            print(f"✅ Pedido {pedw_codi} exportado correctamente")

        except Exception as e:
            print(f"❌ Error exportando pedido {pedido.get('ped_codi')}: {e}")
            continue

    table.close()

    # ========================================================
    # 4) CONFIRMAR EXPORTACION EN DJANGO
    # ========================================================
    if pedidos_exportados:
        try:
            print("Confirmando exportación en backend...")
            r = requests.post(
                API_CONFIRM_URL,
                json={"pedidos": pedidos_exportados},
                timeout=30
            )
            r.raise_for_status()
            print("Backend actualizado:", r.json())
        except Exception as e:
            print(" ERROR confirmando exportación")
            print(" NO vuelvas a ejecutar el script hasta revisar esto")
            print(e)

    print("Proceso finalizado correctamente")


# ============================================================
# EJECUCION
# ============================================================

if __name__ == "__main__":
    importar_pediweb_dbf()


#para ejecutarlo es python nombre_del_archivo.py , en este caso es python importar_back_a_bdf.py
#la bdf y cdx tienen que estar en la misma raiz o carpeta que el mismo .py, es decir, ambos juntos
