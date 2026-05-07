import sys
import requests
import json

BASE_URL = "http://localhost:8000/api"
API_KEY = "5657c8d2427d7577e343ddbef4225ff3"

URL = f"{BASE_URL}/importar_datos/"

RUTA_TMP = "SubInfo.tmp"
SALIDA = "banderasubASR.tmp"

HEADERS = {
    "Authorization": f"Api-Key {API_KEY}",
    "Content-Type": "application/json"
}


def generar_salida(estado):
    with open(SALIDA, "w", encoding="utf-8") as f:
        f.write(str(estado))


# ============================================================
# MAPEO TMP → JSON
# ============================================================
MAPEO = {

    # ========================================================
    # MARCAS
    # ========================================================
    "marc": [
        ("mar_codi", int),
        ("mar_nomb", str),
    ],

    # ========================================================
    # RUBROS
    # ========================================================
    "rub": [
        ("rub_codi", int),
        ("rub_nomb", str),
    ],

    # ========================================================
    # SUBRUBROS
    # ========================================================
    "sru": [
        ("sru_codi", int),
        ("sru_nomb", str),
        ("rub_codi", int),
    ],

    # ========================================================
    # ZONAS
    # ========================================================
    "zona": [
        ("zon_codi", int),
        ("zon_nomb", str),
    ],

    # ========================================================
    # LOCALIDADES
    # ========================================================
    "loca": [
        ("loc_codi", int),
        ("loc_nomb", str),
        ("loc_cpos", str),
        ("pci_codi", int),
        ("zon_codi", int),
    ],

    # ========================================================
    # VENDEDORES
    # ========================================================
    "vend": [
        ("ven_codi", int),
        ("ven_nomb", str),
        ("ven_doc", str),
        ("ven_emai", str),
        ("ven_tele", str),
        ("ven_dom", str),
        ("ven_bar", str),
        ("ven_cuit", str),
        ("ven_usua", str),
        ("ven_clav", str),
        ("ven_actv", bool),
        ("loc_codi", int),
    ],

    # ========================================================
    # CLIENTES
    # ========================================================
    "clie": [
        ("cli_codi", int),
        ("cli_nomb", str),
        ("cli_ndoc", str),
        ("cli_doc", str),
        ("cli_cuit", str),
        ("cli_emai", str),
        ("cli_celu", str),
        ("cli_tele", str),
        ("cli_dire", str),
        ("cli_bar", str),
        ("cli_clav",str)
        ("loc_codi", int),
        ("ven_codi", int),
    ],

    # ========================================================
    # ARTICULOS
    # ========================================================
    "arti": [
        ("art_codi", int),
        ("art_nomb", str),
        ("art_desc", str),
        ("art_pnet", float),
        ("art_cost", float),
        ("art_stk", int),
        ("art_cant", int),
        ("art_tiva", float),
        ("mar_codi", int),
        ("sru_codi", int),
        ("art_acti", bool),
        ("art_visw", bool),
    ],

    # ========================================================
    # PEDIDOS
    # ========================================================
    "pedi": [
        ("ped_codi", int),
        ("ped_fech", str),
        ("cli_codi", int),
        ("ped_tota", float),
        ("ped_fpag", str),
        ("ped_exp", bool),
    ],

    # ========================================================
    # DETALLE PEDIDOS
    # ========================================================
    "dped": [
        ("dpe_codi", int),
        ("ped_codi", int),
        ("art_codi", int),
        ("dpe_cant", int),
    ],
}


# ============================================================
# DESTINOS JSON
# ============================================================
DESTINOS = {

    "marc": "marcas",
    "rub": "rubros",
    "sru": "subrubros",
    "zona": "zonas",
    "loca": "localidades",
    "vend": "vendedores",
    "clie": "clientes",
    "arti": "articulos",
    "pedi": "pedidos",
    "dped": "detalle_pedidos",
}


# ============================================================
# CONVERTIR TIPOS
# ============================================================
def convertir(valor, tipo):

    if valor is None:
        return None

    valor = str(valor).strip()

    if valor == "":
        return None

    try:

        if tipo == int:
            return int(float(valor))

        if tipo == float:
            return float(valor)

        if tipo == bool:
            return valor.lower() in (
                "true",
                "1",
                "t",
                "s",
                "si",
                "y"
            )

        return valor

    except:
        return None


# ============================================================
# PARSER CSV MANUAL
# ============================================================
def parse_line(line):

    row = []
    current = ""
    in_quotes = False

    for char in line:

        if char == '"':
            in_quotes = not in_quotes
            continue

        if char == "," and not in_quotes:
            row.append(current.strip())
            current = ""
        else:
            current += char

    row.append(current.strip())

    return [x.strip() for x in row]


# ============================================================
# LEER TMP
# ============================================================
def leer_tmp(ruta):

    data_final = {

        "marcas": [],
        "rubros": [],
        "subrubros": [],
        "zonas": [],
        "localidades": [],
        "vendedores": [],
        "clientes": [],
        "articulos": [],
        "pedidos": [],
        "detalle_pedidos": [],
    }

    with open(ruta, "r", encoding="utf-8", errors="ignore") as f:

        for line in f:

            line = line.strip()

            if not line:
                continue

            row = parse_line(line)

            if len(row) < 3:
                continue

            tipo = row[1].lower()

            if tipo not in MAPEO:
                continue

            estructura = MAPEO[tipo]

            registro = {}

            base = 2

            for i, (campo, tipo_dato) in enumerate(estructura):

                pos = i + base

                if pos >= len(row):
                    registro[campo] = None
                    continue

                registro[campo] = convertir(
                    row[pos],
                    tipo_dato
                )

            destino = DESTINOS[tipo]

            data_final[destino].append(registro)

    return data_final


# ============================================================
# ENVIAR API
# ============================================================
def enviar_api(data):

    try:

        r = requests.post(
            URL,
            headers=HEADERS,
            json=data,
            timeout=120
        )

        print("STATUS:", r.status_code)

        try:

            respuesta = r.json()

            print("RESPUESTA JSON:")
            print(json.dumps(
                respuesta,
                indent=4,
                ensure_ascii=False
            ))

        except:

            print("RESPUESTA TEXTO:")
            print(r.text)

        return r.status_code in (200, 201)

    except Exception as e:

        print("ERROR REQUEST:", e)

        return False


# ============================================================
# MAIN
# ============================================================
def main():

    data = leer_tmp(RUTA_TMP)

    print("===================================")
    print("JSON GENERADO")
    print("===================================")

    print(json.dumps(
        data,
        indent=4,
        ensure_ascii=False
    ))

    ok = enviar_api(data)

    print("RESULTADO:", ok)

    if not ok:
        generar_salida(0)
        sys.exit(0)

    generar_salida(1)
    sys.exit(1)


if __name__ == "__main__":
    main()