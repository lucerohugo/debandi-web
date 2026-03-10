import requests
import os
import sys
import argparse
from datetime import datetime
from typing import Optional, Dict


class PedidosExport:
    """Exporta pedidos desde Brix-Web a formato TXT"""

    def __init__(self, base_url: str, auth_token: str = None):
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.headers = {}
        if auth_token:
            self.headers['Authorization'] = f'Bearer {auth_token}'

    def obtener_pedidos(self, **filtros) -> Optional[Dict]:
        """Obtiene pedidos desde la API"""
        url = f"{self.base_url}/api/pedidos/export/"
        
        params = {}
        for key, value in filtros.items():
            if value:
                params[f"filter_{key}"] = str(value)
        
        try:
            response = requests.get(
                url,
                headers=self.headers,
                params=params,
                timeout=30
            )
            
            if response.status_code not in [200, 201]:
                print(f"Error {response.status_code}: {response.text[:200]}")
                return None
            
            return response.json()
        
        except requests.exceptions.RequestException as e:
            print(f"Error: {e}")
            return None

    def convertir_txt(self, datos: Dict) -> Optional[str]:
        """Convierte datos JSON a formato CSV plano"""
        if not datos or 'pedidos' not in datos:
            return None
        
        lineas = []
        # Encabezado CSV plano
        encabezado = "ped_codi,cli_codi,cli_nomb,cli_emai,cli_doc,cli_tele,cli_dire,ped_fech,ped_tota,ped_esta,ped_esta_desc,ped_fpag,ped_fpag_desc,cantidad_items,dpe_codi,art_codi,art_nomb,dpe_cant,dpe_prec,dpe_des,dpe_subt"
        lineas.append(encabezado)
        
        for pedido in datos['pedidos']:
            ped_codi = str(pedido.get('ped_codi', ''))
            cli_codi = str(pedido.get('cli_codi', ''))
            cli_nomb = str(pedido.get('cli_nomb', '')).replace('"', '""')
            cli_emai = str(pedido.get('cli_emai', '')).replace('"', '""')
            cli_doc = str(pedido.get('cli_doc', '')).replace('"', '""') if pedido.get('cli_doc') else ''
            cli_tele = str(pedido.get('cli_tele', '')).replace('"', '""') if pedido.get('cli_tele') else ''
            cli_dire = str(pedido.get('cli_dire', '')).replace('"', '""') if pedido.get('cli_dire') else ''
            
            ped_fech_raw = pedido.get('ped_fech', '')
            if ped_fech_raw:
                try:
                    ped_fech = datetime.fromisoformat(
                        ped_fech_raw.replace('Z', '+00:00')).strftime('%Y-%m-%d')
                except:
                    ped_fech = ped_fech_raw[:10]
            else:
                ped_fech = ''
            
            ped_tota = str(pedido.get('ped_tota', 0))
            ped_esta = str(pedido.get('ped_esta', ''))
            ped_esta_desc = str(pedido.get('ped_esta_desc', '')).replace('"', '""')
            ped_fpag = str(pedido.get('ped_fpag', ''))
            ped_fpag_desc = str(pedido.get('ped_fpag_desc', '')).replace('"', '""')
            cantidad_items = str(pedido.get('cantidad_items', 0))
            
            # Por cada detalle, crear una fila
            detalles = pedido.get('detalles', [])
            if detalles:
                for det in detalles:
                    dpe_codi = str(det.get('dpe_codi', ''))
                    art_codi = str(det.get('art_codi', ''))
                    art_nomb = str(det.get('art_nomb', '')).replace('"', '""')
                    dpe_cant = str(det.get('dpe_cant', 0))
                    dpe_prec = str(det.get('dpe_prec', 0))
                    dpe_des = str(det.get('dpe_des', 0))
                    dpe_subt = str(det.get('dpe_subt', 0))
                    
                    # Construir fila CSV con comillas donde sea necesario
                    linea = f'{ped_codi},{cli_codi},"{cli_nomb}","{cli_emai}","{cli_doc}","{cli_tele}","{cli_dire}",{ped_fech},{ped_tota},{ped_esta},"{ped_esta_desc}",{ped_fpag},"{ped_fpag_desc}",{cantidad_items},{dpe_codi},{art_codi},"{art_nomb}",{dpe_cant},{dpe_prec},{dpe_des},{dpe_subt}'
                    lineas.append(linea)
            else:
                # Si no hay detalles, una fila sin datos de detalle
                linea = f'{ped_codi},{cli_codi},"{cli_nomb}","{cli_emai}","{cli_doc}","{cli_tele}","{cli_dire}",{ped_fech},{ped_tota},{ped_esta},"{ped_esta_desc}",{ped_fpag},"{ped_fpag_desc}",{cantidad_items},,,,,,,,'
                lineas.append(linea)
        
        return "\n".join(lineas)

    def guardar(self, contenido: str, nombre: str = "pedidos") -> Optional[str]:
        """Guarda contenido en archivo TXT"""
        if not contenido:
            return None
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archivo = f"{nombre}_{timestamp}.txt"
        ruta = os.path.abspath(archivo)
        
        try:
            with open(ruta, 'w', encoding='utf-8') as f:
                f.write(contenido)
            
            lineas = len(contenido.split('\n')) - 1
            print(f"Archivo: {archivo}")
            print(f"Registros: {lineas}")
            return ruta
        
        except Exception as e:
            print(f"Error: {e}")
            return None

    def verificar(self) -> bool:
        """Verifica conexión con el servidor"""
        try:
            response = requests.get(
                f"{self.base_url}/api/pedidos/export/",
                timeout=5
            )
            return response.status_code in [200, 201, 400]
        except:
            return False

    def exportar(self, **filtros) -> Optional[str]:
        """Exporta pedidos a TXT"""
        print("Obteniendo pedidos...")
        datos = self.obtener_pedidos(**filtros)
        
        if not datos:
            return None
        
        print("Convirtiendo a TXT...")
        txt = self.convertir_txt(datos)
        
        if not txt:
            print("Sin datos")
            return None
        
        print("Guardando...")
        return self.guardar(txt)


def main():
    parser = argparse.ArgumentParser(description="Exportar pedidos a TXT")
    
    parser.add_argument('--fecha_desde', help='Fecha inicio (YYYY-MM-DD)')
    parser.add_argument('--fecha_hasta', help='Fecha fin (YYYY-MM-DD)')
    parser.add_argument('--estado', help='Estado (P/F/C)')
    parser.add_argument('--cliente_id', type=int, help='ID cliente')
    parser.add_argument('--forma_pago', help='Forma pago (CDO/CTC/CHQ)')
    parser.add_argument('--url', default='http://localhost:8000')
    parser.add_argument('--token', help='Token')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Exportador de Pedidos - Brix-Web")
    print("=" * 60)
    print(f"Servidor: {args.url}\n")
    
    exp = PedidosExport(args.url, args.token)
    
    print("Verificando...")
    if not exp.verificar():
        print("No se pudo conectar")
        return 1
    
    print("OK\n")
    
    filtros = {}
    if args.fecha_desde:
        filtros['fecha_desde'] = args.fecha_desde
    if args.fecha_hasta:
        filtros['fecha_hasta'] = args.fecha_hasta
    if args.estado:
        filtros['estado'] = args.estado
    if args.cliente_id:
        filtros['cliente_id'] = args.cliente_id
    if args.forma_pago:
        filtros['forma_pago'] = args.forma_pago
    
    if filtros:
        print(f"Filtros: {filtros}\n")
    
    ruta = exp.exportar(**filtros)
    
    if ruta:
        print(f"\nExito")
        return 0
    else:
        print(f"\nFallo")
        return 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nCancelado")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
