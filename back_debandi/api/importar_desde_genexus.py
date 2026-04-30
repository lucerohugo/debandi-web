"""
Integración Genexus - Sincronización de datos hacia Django
Importa: Rubros, Subrubros, Artículos, Clientes desde Genexus
"""

import requests
import json
import csv
from datetime import datetime
import os
import sys

class GenexusAPI:
    """Clase para manejar la integración con Genexus y Django"""
    
    def __init__(self, genexus_url, django_url, auth_token=None):
        self.genexus_url = genexus_url.rstrip('/')
        self.django_url = django_url.rstrip('/')
        self.auth_token = auth_token
        self.headers = {'Content-Type': 'application/json'}
        if auth_token:
            self.headers['Authorization'] = f'Bearer {auth_token}'
        self.rate_limit_remaining = 100
    
    def handle_response(self, response, endpoint=""):
        """Maneja la respuesta de la API y actualiza límites de tasa"""
        if 'X-RateLimit-Remaining' in response.headers:
            self.rate_limit_remaining = int(response.headers['X-RateLimit-Remaining'])
        
        if response.status_code not in [200, 201]:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', response.text[:500])
            except:
                error_msg = response.text[:500]
            
            print(f"❌ Error {response.status_code} en {endpoint}: {error_msg}")
            return None
        
        return response
    
    def obtener_datos_genexus(self, endpoint):
        """Obtiene datos desde Genexus"""
        url = f"{self.genexus_url}/api/{endpoint}"
        
        try:
            print(f"📥 Obteniendo datos de {endpoint}...")
            response = requests.get(
                url,
                headers=self.headers,
                timeout=30
            )
            
            if not self.handle_response(response, endpoint):
                return None
            
            response.encoding = 'utf-8'
            return response.json()
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Error de conexión con Genexus: {str(e)}")
            return None
    
    def enviar_a_django(self, endpoint, datos):
        """Envía datos procesados a Django"""
        url = f"{self.django_url}/subida/{endpoint}/"
        
        try:
            print(f"📤 Enviando {endpoint} a Django...")
            response = requests.post(
                url,
                json={endpoint: datos} if isinstance(datos, list) else datos,
                headers=self.headers,
                timeout=30
            )
            
            if not self.handle_response(response, f"subida/{endpoint}"):
                return None
            
            return response.json()
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Error al enviar a Django: {str(e)}")
            return None
    
    def guardar_resultados_csv(self, datos, nombre_base):
        """Guarda los resultados en un archivo CSV"""
        if not datos:
            return None
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        nombre_archivo = f"{nombre_base}_{timestamp}.csv"
        
        try:
            # Si es respuesta JSON con resumen
            if isinstance(datos, dict) and 'importados' in datos:
                contenido = f"""Sincronización completada - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Importados: {datos.get('importados', 0)}
Actualizados: {datos.get('actualizados', 0)}
Total procesados: {datos.get('total_procesados', 0)}
Errores: {len(datos.get('errores', []))}

Detalles de errores:
{json.dumps(datos.get('errores', []), indent=2, ensure_ascii=False)}
"""
            else:
                # Si es lista de registros
                if isinstance(datos, list) and len(datos) > 0:
                    with open(nombre_archivo, 'w', newline='', encoding='utf-8-sig') as f:
                        writer = csv.DictWriter(f, fieldnames=datos[0].keys())
                        writer.writeheader()
                        writer.writerows(datos)
                    print(f"✅ CSV guardado: {len(datos)} registros")
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
        """Verifica si la conexión es válida"""
        print("🔐 Verificando conexión con Genexus...")
        try:
            response = requests.get(
                f"{self.genexus_url}/api/rubros",
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                print("✅ Conexión con Genexus: OK")
                return True
            else:
                print(f"⚠️ Genexus respondió con código {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ No se pudo conectar a Genexus: {str(e)}")
            return False
    
    def sincronizar_rubros(self):
        """Sincroniza rubros desde Genexus a Django"""
        print("\n" + "="*60)
        print("SINCRONIZANDO RUBROS")
        print("="*60)
        
        datos = self.obtener_datos_genexus('rubros')
        if not datos:
            return False
        
        resultado = self.enviar_a_django('rubros', datos)
        if resultado:
            self.guardar_resultados_csv(resultado, 'rubros_sync')
            return True
        return False
    
    def sincronizar_subrubros(self):
        """Sincroniza subrubros desde Genexus a Django"""
        print("\n" + "="*60)
        print("SINCRONIZANDO SUBRUBROS")
        print("="*60)
        
        datos = self.obtener_datos_genexus('subrubros')
        if not datos:
            return False
        
        resultado = self.enviar_a_django('subrubros', datos)
        if resultado:
            self.guardar_resultados_csv(resultado, 'subrubros_sync')
            return True
        return False
    
    def sincronizar_articulos(self):
        """Sincroniza artículos desde Genexus a Django"""
        print("\n" + "="*60)
        print("SINCRONIZANDO ARTÍCULOS")
        print("="*60)
        
        datos = self.obtener_datos_genexus('articulos')
        if not datos:
            return False
        
        resultado = self.enviar_a_django('articulos', datos)
        if resultado:
            self.guardar_resultados_csv(resultado, 'articulos_sync')
            return True
        return False
    
    def sincronizar_clientes(self):
        """Sincroniza clientes desde Genexus a Django"""
        print("\n" + "="*60)
        print("SINCRONIZANDO CLIENTES")
        print("="*60)
        
        datos = self.obtener_datos_genexus('clientes')
        if not datos:
            return False
        
        resultado = self.enviar_a_django('clientes', datos)
        if resultado:
            self.guardar_resultados_csv(resultado, 'clientes_sync')
            return True
        return False

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

GENEXUS_URL = "http://genexus-server"  # Cambiar por URL real de Genexus
DJANGO_URL = "http://127.0.0.1:8000"   # URL Django
AUTH_TOKEN = None  # Opcional, solo si Genexus requiere autenticación

# Crear instancia de la API
api = GenexusAPI(GENEXUS_URL, DJANGO_URL, AUTH_TOKEN)

# ============================================================================
# MENÚ PRINCIPAL
# ============================================================================

def main_menu():
    """Menú interactivo principal"""
    while True:
        print("\n" + "="*60)
        print("SINCRONIZACIÓN GENEXUS ↔ DJANGO")
        print("="*60)
        print("1. Sincronizar Rubros")
        print("2. Sincronizar Subrubros")
        print("3. Sincronizar Artículos")
        print("4. Sincronizar Clientes")
        print("5. Sincronizar TODO")
        print("6. Configurar URLs")
        print("7. Verificar Conexión")
        print("8. Salir")
        
        opcion = input("\nSeleccione una opción (1-8): ").strip()
        
        if opcion == "1":
            api.sincronizar_rubros()
        
        elif opcion == "2":
            api.sincronizar_subrubros()
        
        elif opcion == "3":
            api.sincronizar_articulos()
        
        elif opcion == "4":
            api.sincronizar_clientes()
        
        elif opcion == "5":
            sincronizar_todo()
        
        elif opcion == "6":
            configurar_urls()
        
        elif opcion == "7":
            api.verificar_conexion()
        
        elif opcion == "8":
            print("\n👋 Saliendo del programa...")
            sys.exit(0)
        
        else:
            print("❌ Opción inválida. Intente nuevamente.")

def sincronizar_todo():
    """Sincroniza todos los datos"""
    print("\n" + "="*60)
    print("SINCRONIZACIÓN COMPLETA GENEXUS → DJANGO")
    print("="*60)
    
    items = [
        ("Rubros", api.sincronizar_rubros),
        ("Subrubros", api.sincronizar_subrubros),
        ("Artículos", api.sincronizar_articulos),
        ("Clientes", api.sincronizar_clientes)
    ]
    
    resultados = {}
    for nombre, funcion in items:
        try:
            resultados[nombre] = funcion()
        except Exception as e:
            print(f"❌ Error sincronizando {nombre}: {str(e)}")
            resultados[nombre] = False
    
    # Resumen final
    print("\n" + "="*60)
    print("RESUMEN DE SINCRONIZACIÓN")
    print("="*60)
    for nombre, exito in resultados.items():
        estado = "✅ OK" if exito else "❌ ERROR"
        print(f"{nombre}: {estado}")
    print("="*60)

def configurar_urls():
    """Permite configurar las URLs"""
    global GENEXUS_URL, DJANGO_URL, api
    
    print("\n" + "="*60)
    print("CONFIGURAR URLs")
    print("="*60)
    
    genexus_input = input(f"URL Genexus [{GENEXUS_URL}]: ").strip()
    if genexus_input:
        GENEXUS_URL = genexus_input
    
    django_input = input(f"URL Django [{DJANGO_URL}]: ").strip()
    if django_input:
        DJANGO_URL = django_input
    
    # Recrear instancia con nuevas URLs
    api = GenexusAPI(GENEXUS_URL, DJANGO_URL, AUTH_TOKEN)
    print("✅ Configuración actualizada")

# ============================================================================
# EJECUCIÓN
# ============================================================================

if __name__ == "__main__":
    try:
        # Verificar conexión inicial
        if not api.verificar_conexion():
            print("\n⚠️  Advertencia: No se pudo conectar a Genexus")
            print(f"   URL: {GENEXUS_URL}")
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

#esto seria de genexus a la db de django