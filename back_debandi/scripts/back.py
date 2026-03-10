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
# ===============================
ARTICULOS = [
    {
        "art_nomb": "Yerba Mate Playadito 1kg",
        "art_desc": "Yerba mate tradicional",
        "art_pnet": Decimal("1500.00"),
        "art_cost": Decimal("1100.00"),
        "art_stku": 50,
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

    print(" Carga de artículos finalizada")
