import os
import sys
import django
from decimal import Decimal

# ===============================
# CONFIG DJANGO
# ===============================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    'config.settings'  # 
)

django.setup()

# ===============================
# MODELOS
# ===============================
from gestion.models import (
    Articulo,
    Marca,
    Rubro,
    SubRubro
)

# ===============================
# DATA DE EJEMPLO (SIMULA BDF / API / TXT)
# ===============================import os
import sys
import django
from decimal import Decimal

# ===============================
# CONFIG DJANGO
# ===============================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings"
)

django.setup()

# ===============================
# MODELOS
# ===============================
from gestion.models import Articulo, Marca, Rubro, SubRubro

# ===============================
# NORMALIZADOR (clave para CSV / TXT / API)
# ===============================
def normalizar_articulo(raw):
    """
    Convierte cualquier entrada (csv, txt, api, dbf)
    al formato que espera Django
    """
    return {
        "art_nomb": raw["art_nomb"],
        "art_desc": raw.get("art_desc", ""),
        "art_pnet": Decimal(raw.get("art_pnet", 0)),
        "art_cost": Decimal(raw.get("art_cost", 0)),
        "art_stku": int(raw.get("art_stku", 0)),
        "art_stkm": int(raw.get("art_stkm", 0)),
        "art_tiva": raw.get("art_tiva", "21"),
        "marca": raw["marca"],
        "rubro": raw["rubro"],
        "subrubro": raw["subrubro"],
    }

# ===============================
# UPSERT ARTICULO
# ===============================
def upsert_articulo(data, origen="SCRIPT"):
    data = normalizar_articulo(data)

    marca, _ = Marca.objects.get_or_create(
        mar_nomb=data["marca"]
    )

    rubro, _ = Rubro.objects.get_or_create(
        rub_nomb=data["rubro"]
    )

    subrubro, _ = SubRubro.objects.get_or_create(
        sru_nomb=data["subrubro"],
        rub_codi=rubro
    )

    articulo, creado = Articulo.objects.update_or_create(
        art_nomb=data["art_nomb"],
        mar_codi=marca,
        sru_codi=subrubro,
        defaults={
            "art_desc": data["art_desc"],
            "art_pnet": data["art_pnet"],
            "art_cost": data["art_cost"],
            "art_stku": data["art_stku"],
            "art_stkm": data["art_stkm"],
            "art_tiva": data["art_tiva"],
            "art_acti": True,
            "art_org": origen,
        }
    )

    print(
        f"[{'CREADO' if creado else 'ACTUALIZADO'}] "
        f"{articulo.art_nomb} | Origen: {origen}"
    )

# ===============================
# MAIN (esto lo llama el .bat o .exe)
# ===============================
def main():
    ARTICULOS = [
        {
            "art_nomb": "Yerba Mate Playadito 1kg",
            "art_desc": "Yerba mate tradicional",
            "art_pnet": "1500.00",
            "art_cost": "1100.00",
            "art_stku": 50,
            "art_stkm": 10,
            "art_tiva": "21",
            "marca": "Playadito",
            "rubro": "Alimentos",
            "subrubro": "Yerbas",
        },
    ]

    for item in ARTICULOS:
        upsert_articulo(item, origen="SCRIPT")

    print("Carga finalizada")

# ===============================
if __name__ == "__main__":
    main()

#aca tengo hardcodeado el articulo
ARTICULOS = [
    {
        "art_nomb": "Yerba Mate Playadito 1kg",
        "art_desc": "Yerba mate tradicional",
        "art_pnet": Decimal("1500.00"),
        "art_cost": Decimal("1100.00"),
        "art_stku": 55,
        "art_stkm": 10,
        "art_tiva": "21",
        "marca": "Playadito",
        "rubro": "Alimentos",
        "subrubro": "Yerbas",
    },
]

# ===============================
# UPSERT ARTICULO
# ===============================
def upsert_articulo(data):
    # ---------- MARCA ----------
    marca, _ = Marca.objects.get_or_create(
        mar_nomb=data["marca"]
    )

    # ---------- RUBRO ----------
    rubro, _ = Rubro.objects.get_or_create(
        rub_nomb=data["rubro"]
    )

    # ---------- SUBRUBRO ----------
    subrubro, _ = SubRubro.objects.get_or_create(
        sru_nomb=data["subrubro"],
        rub_codi=rubro
    )

    # ---------- ARTICULO ----------
    articulo, creado = Articulo.objects.update_or_create(
        art_nomb=data["art_nomb"],
        defaults={
            "art_desc": data.get("art_desc", ""),
            "art_pnet": data["art_pnet"],
            "art_cost": data.get("art_cost"),
            "art_stku": data.get("art_stku", 0),
            "art_stkm": data.get("art_stkm", 0),
            "art_tiva": data.get("art_tiva", "21"),
            "mar_codi": marca,
            "sru_codi": subrubro,
            "art_acti": True,
            "art_org": "SCRIPT",  
        }
    )

    accion = "CREADO" if creado else "ACTUALIZADO"
    print(f"[{accion}] {articulo.art_nomb}")

# ===============================
# MAIN
# ===============================
if __name__ == "__main__":
    for data in ARTICULOS:
        upsert_articulo(data)

    print("Carga de artículos finalizada")
