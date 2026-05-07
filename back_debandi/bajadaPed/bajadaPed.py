import sys
import requests

# ============================================================================
# CONFIGURACIÓN API
# ============================================================================
BASE_URL = "http://localhost:8000/api"
API_KEY = "5657c8d2427d7577e343ddbef4225ff3"

URL = f"{BASE_URL}/pedidos/?ped_exp=false"

RUTA_TMP = "Pedidos.tmp"
SALIDA = "banderaped.tmp"

# Headers con API Key para autenticación
HEADERS = {
    "Authorization": f"Api-Key {API_KEY}",
    "Content-Type": "application/json"
}


def generar_salida(estado):
    """Escribir estado de salida"""
    with open(SALIDA, "w", encoding="utf-8") as f:
        f.write(str(estado))


def obtener_pedidos(url):
    """Obtener pedidos de la API con paginación"""
    pedidos = []

    while url:
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            r.raise_for_status()

            data = r.json()

            pedidos.extend(data.get("results", []))

            url = data.get("next")

        except requests.exceptions.RequestException as e:
            print(f"Error en solicitud HTTP: {e}")
            raise

    return pedidos


def safe(v):
    """Convertir valor a string seguro"""
    return "" if v is None else str(v)


def main():

    try:

        print(f"Conectando a {URL}...")
        print(f"Usando API Key: {API_KEY[:10]}...")

        pedidos = obtener_pedidos(URL)

        if not pedidos:
            print("No se encontraron pedidos")
            generar_salida(0)
            sys.exit(0)

        print(f"Se encontraron {len(pedidos)} pedidos")

        contador = 1

        with open(RUTA_TMP, "w", encoding="utf-8") as f:

            for p in pedidos:

                detalles = p.get("detalles", [])

                # =========================================================
                # UNA LÍNEA POR CADA DETALLE
                # =========================================================
                for d in detalles:

                    linea = [

                        # -------------------------------------------------
                        # CONTROL
                        # -------------------------------------------------
                        contador,
                        "pedi",

                        # -------------------------------------------------
                        # CABECERA PEDIDO
                        # -------------------------------------------------
                        safe(p.get("ped_codi")),

                        safe(p.get("ped_fech"))
                        .replace("T", " ")
                        .split(".")[0],

                        safe(p.get("cli_codi")),

                        safe(p.get("ped_tota")),

                        safe(p.get("ped_fpag")),

                        # -------------------------------------------------
                        # DETALLE PEDIDO
                        # -------------------------------------------------
                        safe(d.get("dpe_codi")),

                        safe(d.get("art_codi")),

                        safe(d.get("dpe_cant")),

                        safe(d.get("art_pfin")),

                        safe(d.get("art_descu")),
                    ]

                    f.write(",".join(f'"{x}"' for x in linea) + "\n")

                    contador += 1

        print(f"Archivo {RUTA_TMP} generado exitosamente")

        generar_salida(1)

        sys.exit(1)

    except Exception as e:

        print(f"ERROR: {e}")

        generar_salida(0)

        sys.exit(0)


if __name__ == "__main__":
    main()