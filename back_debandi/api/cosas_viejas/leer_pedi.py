from dbfread import DBF
from pathlib import Path


DBF_PATH = "PEDIWEB.DBF"   


def mostrar_estructura(tabla: DBF):
    print("=" * 60)
    print("ESTRUCTURA DE LA TABLA")
    print("=" * 60)

    for campo in tabla.fields:
        print(
            f"{campo.name:<15} "
            f"Tipo: {campo.type} "
            f"Longitud: {campo.length} "
            f"Decimales: {campo.decimal_count}"
        )


def leer_registros(tabla: DBF, limite: int = 10):
    print("\n" + "=" * 60)
    print(f"PRIMEROS {limite} REGISTROS")
    print("=" * 60)

    for i, registro in enumerate(tabla):
        if i >= limite:
            break
        print(f"\nRegistro #{i + 1}")
        for k, v in registro.items():
            print(f"  {k}: {v}")


def main():
    ruta = Path(DBF_PATH)

    if not ruta.exists():
        print(f"❌ No se encontró el archivo: {ruta.resolve()}")
        return

    print(f"📂 Leyendo archivo: {ruta.resolve()}")

    try:
        tabla = DBF(
            ruta,
            encoding="latin-1",     # muy común en DBF antiguos
            load=True               # carga todo en memoria (más seguro)
        )
    except Exception as e:
        print(f"❌ Error abriendo DBF: {e}")
        return

    print(f"✅ Registros totales: {len(tabla)}")

    mostrar_estructura(tabla)
    leer_registros(tabla, limite=5)

    print("\n✔ Lectura finalizada (sin modificar archivos)")


if __name__ == "__main__":
    main()
