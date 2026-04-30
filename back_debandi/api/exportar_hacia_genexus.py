"""
Integración Django - Sincronización de datos hacia Genexus
Exporta: Rubros, Subrubros, Artículos, Clientes desde Django
"""

import requests
import json
import csv
from datetime import datetime
import os
import sys

class DjangoExportAPI:
    """Clase para exportar datos desde Django hacia Genexus"""
    
    def __init__(self, django_url, genexus_url, django_token=None, genexus_token=None):
        self.django_url = django_url.rstrip('/')
        self.genexus_url = genexus_url.rstrip('/')
        self.django_token = django_token
        self.genexus_token = genexus_token
        self.headers_django = {'Content-Type': 'application/json'}
        self.headers_genexus = {'Content-Type': 'application/json'}
        
        if django_token:
            self.headers_django['Authorization'] = f'Bearer {django_token}'
        if genexus_token:
            self.headers_genexus['Authorization'] = f'Bearer {genexus_token}'
        
        self.rate_limit_remaining = 100
    
    def handle_response(self, response, endpoint="", origen=""):
        """Maneja la respuesta de la API"""
        if 'X-RateLimit-Remaining' in response.headers:
            self.rate_limit_remaining = int(response.headers['X-RateLimit-Remaining'])
        
        if response.status_code not in [200, 201]:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', response.text[:500])
            except:
                error_msg = response.text[:500]
            
            print(f"❌ Error {response.status_code} en {origen}/{endpoint}: {error_msg}")
            return None
        
        return response
    
    def obtener_datos_django(self, endpoint):
        """Obtiene datos desde Django"""
        url = f"{self.django_url}/bajada/{endpoint}/"
        
        try:
            print(f"📥 Obteniendo {endpoint} desde Django...")
            response = requests.get(
                url,
                headers=self.headers_django,
                timeout=30
            )
            
            if not self.handle_response(response, endpoint, "Django"):
                return None
            
            response.encoding = 'utf-8'
            datos = response.json()
            
            # Extraer los datos según la estructura de respuesta
            if isinstance(datos, dict):
                # Si es un dict con clave 'rubros', 'subrubros', etc.
                if endpoint in datos:
                    return datos[endpoint]
                # Si es directamente una lista
                elif isinstance(datos, list):
                    return datos
                # Si tiene una clave 'data' o 'results'
                elif 'data' in datos:
                    return datos['data']
                elif 'results' in datos:
                    return datos['results']
                else:
                    return datos
            
            return datos
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Error de conexión con Django: {str(e)}")
            return None
    
    def enviar_a_genexus(self, endpoint, datos):
        """Envía datos a Genexus"""
        url = f"{self.genexus_url}/api/importar/{endpoint}"
        
        try:
            print(f"📤 Enviando {endpoint} a Genexus...")
            payload = {
                endpoint: datos,
                'timestamp': datetime.now().isoformat(),
                'origen': 'django'
            }
            
            response = requests.post(
                url,
                json=payload,
                headers=self.headers_genexus,
                timeout=30
            )
            
            if not self.handle_response(response, f"{endpoint}/import", "Genexus"):
                return None
            
            return response.json()
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Error al enviar a Genexus: {str(e)}")
            return None
    
    def guardar_resultados_csv(self, datos, nombre_base):
        """Guarda los resultados en un archivo CSV"""
        if not datos:
            return None
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        nombre_archivo = f"{nombre_base}_export_{timestamp}.csv"
        
        try:
            # Si es respuesta JSON con resumen
            if isinstance(datos, dict) and 'importados' in datos:
                contenido = f"""Exportación completada - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Enviados: {datos.get('importados', 0)}
Actualizados en Genexus: {datos.get('actualizados', 0)}
Total procesados: {datos.get('total_procesados', 0)}
Errores: {len(datos.get('errores', []))}

Detalles de errores:
{json.dumps(datos.get('errores', []), indent=2, ensure_ascii=False)}
"""
            else:
                # Si es lista de registros, guardar como CSV
                if isinstance(datos, list) and len(datos) > 0:
                    with open(nombre_archivo, 'w', newline='', encoding='utf-8-sig') as f:
                        # Obtener todas las claves posibles
                        fieldnames = set()
                        for item in datos:
                            if isinstance(item, dict):
                                fieldnames.update(item.keys())
                        
                        fieldnames = list(fieldnames)
                        writer = csv.DictWriter(f, fieldnames=fieldnames)
                        writer.writeheader()
                        writer.writerows(datos)
                    
                    print(f"✅ CSV generado: {len(datos)} registros")
                    print(f"📄 Ruta: {os.path.abspath(nombre_archivo)}")
                    return nombre_archivo
                else:
                    contenido = json.dumps(datos, indent=2, ensure_ascii=False)
            
            with open(nombre_archivo, 'w', encoding='utf-8') as f:
                f.write(contenido)
            
            print(f"✅ Archivo guardado: {nombre_archivo}")
            return nombre_archivo
        
        except Exception as e:
            print(f"❌ Error al guardar archivo: {str(e)}")
            return None
    
    def verificar_conexion(self):
        """Verifica si las conexiones son válidas"""
        print("🔐 Verificando conexiones...")
        
        django_ok = False
        genexus_ok = False
        
        try:
            response = requests.get(
                f"{self.django_url}/api/",
                headers=self.headers_django,
                timeout=10
            )
            if response.status_code in [200, 404]:  # 404 es OK si la ruta no existe, significa que Django responde
                print("✅ Conexión con Django: OK")
                django_ok = True
            else:
                print(f"⚠️ Django respondió con código {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ No se pudo conectar a Django: {str(e)}")
        
        try:
            response = requests.get(
                f"{self.genexus_url}/api/rubros",
                headers=self.headers_genexus,
                timeout=10
            )
            if response.status_code == 200:
                print("✅ Conexión con Genexus: OK")
                genexus_ok = True
            else:
                print(f"⚠️ Genexus respondió con código {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ No se pudo conectar a Genexus: {str(e)}")
        
        return django_ok and genexus_ok
    
    def exportar_rubros(self):
        """Exporta rubros desde Django a Genexus"""
        print("\n" + "="*60)
        print("EXPORTANDO RUBROS")
        print("="*60)
        
        datos = self.obtener_datos_django('rubros')
        if not datos:
            print("⚠️ No hay rubros para exportar")
            return False
        
        print(f"📊 Rubros encontrados: {len(datos) if isinstance(datos, list) else 1}")
        
        resultado = self.enviar_a_genexus('rubros', datos)
        if resultado:
            self.guardar_resultados_csv(resultado, 'rubros')
            return True
        return False
    
    def exportar_subrubros(self):
        """Exporta subrubros desde Django a Genexus"""
        print("\n" + "="*60)
        print("EXPORTANDO SUBRUBROS")
        print("="*60)
        
        datos = self.obtener_datos_django('subrubros')
        if not datos:
            print("⚠️ No hay subrubros para exportar")
            return False
        
        print(f"📊 Subrubros encontrados: {len(datos) if isinstance(datos, list) else 1}")
        
        resultado = self.enviar_a_genexus('subrubros', datos)
        if resultado:
            self.guardar_resultados_csv(resultado, 'subrubros')
            return True
        return False
    
    def exportar_articulos(self):
        """Exporta artículos desde Django a Genexus"""
        print("\n" + "="*60)
        print("EXPORTANDO ARTÍCULOS")
        print("="*60)
        
        datos = self.obtener_datos_django('articulos')
        if not datos:
            print("⚠️ No hay artículos para exportar")
            return False
        
        print(f"📊 Artículos encontrados: {len(datos) if isinstance(datos, list) else 1}")
        
        resultado = self.enviar_a_genexus('articulos', datos)
        if resultado:
            self.guardar_resultados_csv(resultado, 'articulos')
            return True
        return False
    
    def exportar_clientes(self):
        """Exporta clientes desde Django a Genexus"""
        print("\n" + "="*60)
        print("EXPORTANDO CLIENTES")
        print("="*60)
        
        datos = self.obtener_datos_django('clientes')
        if not datos:
            print("⚠️ No hay clientes para exportar")
            return False
        
        print(f"📊 Clientes encontrados: {len(datos) if isinstance(datos, list) else 1}")
        
        resultado = self.enviar_a_genexus('clientes', datos)
        if resultado:
            self.guardar_resultados_csv(resultado, 'clientes')
            return True
        return False

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

DJANGO_URL = "http://127.0.0.1:8000"      # URL Django local
GENEXUS_URL = "http://genexus-server"     # Cambiar por URL real de Genexus
DJANGO_TOKEN = None  # Opcional, solo si requiere autenticación
GENEXUS_TOKEN = None  # Opcional, solo si Genexus requiere autenticación

# Crear instancia de la API
api = DjangoExportAPI(DJANGO_URL, GENEXUS_URL, DJANGO_TOKEN, GENEXUS_TOKEN)

# ============================================================================
# MENÚ PRINCIPAL
# ============================================================================

def main_menu():
    """Menú interactivo principal"""
    while True:
        print("\n" + "="*60)
        print("EXPORTACIÓN DJANGO → GENEXUS (BAJADA)")
        print("="*60)
        print("1. Exportar Rubros")
        print("2. Exportar Subrubros")
        print("3. Exportar Artículos")
        print("4. Exportar Clientes")
        print("5. Exportar TODO")
        print("6. Configurar URLs")
        print("7. Verificar Conexión")
        print("8. Salir")
        
        opcion = input("\nSeleccione una opción (1-8): ").strip()
        
        if opcion == "1":
            api.exportar_rubros()
        
        elif opcion == "2":
            api.exportar_subrubros()
        
        elif opcion == "3":
            api.exportar_articulos()
        
        elif opcion == "4":
            api.exportar_clientes()
        
        elif opcion == "5":
            exportar_todo()
        
        elif opcion == "6":
            configurar_urls()
        
        elif opcion == "7":
            api.verificar_conexion()
        
        elif opcion == "8":
            print("\n👋 Saliendo del programa...")
            sys.exit(0)
        
        else:
            print("❌ Opción inválida. Intente nuevamente.")

def exportar_todo():
    """Exporta todos los datos desde Django a Genexus"""
    print("\n" + "="*60)
    print("EXPORTACIÓN COMPLETA DJANGO → GENEXUS")
    print("="*60)
    
    items = [
        ("Rubros", api.exportar_rubros),
        ("Subrubros", api.exportar_subrubros),
        ("Artículos", api.exportar_articulos),
        ("Clientes", api.exportar_clientes)
    ]
    
    resultados = {}
    for nombre, funcion in items:
        try:
            resultados[nombre] = funcion()
        except Exception as e:
            print(f"❌ Error exportando {nombre}: {str(e)}")
            resultados[nombre] = False
    
    # Resumen final
    print("\n" + "="*60)
    print("RESUMEN DE EXPORTACIÓN")
    print("="*60)
    for nombre, exito in resultados.items():
        estado = "✅ OK" if exito else "❌ ERROR"
        print(f"{nombre}: {estado}")
    print("="*60)

def configurar_urls():
    """Permite configurar las URLs"""
    global DJANGO_URL, GENEXUS_URL, api
    
    print("\n" + "="*60)
    print("CONFIGURAR URLs")
    print("="*60)
    
    django_input = input(f"URL Django [{DJANGO_URL}]: ").strip()
    if django_input:
        DJANGO_URL = django_input
    
    genexus_input = input(f"URL Genexus [{GENEXUS_URL}]: ").strip()
    if genexus_input:
        GENEXUS_URL = genexus_input
    
    # Recrear instancia con nuevas URLs
    api = DjangoExportAPI(DJANGO_URL, GENEXUS_URL, DJANGO_TOKEN, GENEXUS_TOKEN)
    print("✅ Configuración actualizada")

# ============================================================================
# EJECUCIÓN
# ============================================================================

if __name__ == "__main__":
    try:
        # Verificar conexión inicial
        if not api.verificar_conexion():
            print("\n⚠️  Advertencia: No se pudo conectar a ambos servidores")
            print(f"   Django: {DJANGO_URL}")
            print(f"   Genexus: {GENEXUS_URL}")
            continuar = input("¿Desea continuar? (s/n): ").strip().lower()
            if continuar != 's':
                sys.exit(1)
        
        # Mostrar menú
        main_menu()
    
    except KeyboardInterrupt:
        print("\n\n👋 Programa interrumpido por el usuario")
        sys.exit(0)
    
    except Exception as e:
        print(f"\n❌ Error inesperado: {str(e)}")
        sys.exit(1)


#este seria de la db de django a genexus 