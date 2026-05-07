import requests
import sys

#informa los pedidos que estan en falso los pasa a true 

BASE_URL = "http://127.0.0.1:8000/api"

API_KEY = "5657c8d2427d7577e343ddbef4225ff3"

URL = f"{BASE_URL}/pedidos/marcar_exportados/"

RUTA_TMP = "PedProc.tmp"

# =========================================
# HEADERS
# =========================================
HEADERS = {
    "Authorization": f"Api-Key {API_KEY}",
    "Content-Type": "application/json"
}

ped_codis = []

# =========================================
# LEER TMP
# =========================================
with open(RUTA_TMP, "r") as f:

    for linea in f:
        linea = linea.strip().replace('"', '')
        if linea:
            try:
                ped_codis.append(int(linea))
            except:
                pass

# =========================================
# EVITAR LLAMADA VACÍA
# =========================================
if not ped_codis:
    print("No hay pedidos para informar")
    sys.exit(0)

# =========================================
# LLAMAR API
# =========================================
response = requests.post(URL,json={"ped_codis": ped_codis},headers=HEADERS)

