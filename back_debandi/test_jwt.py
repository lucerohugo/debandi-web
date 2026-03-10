#!/usr/bin/env python
"""
Script de Test para JWT Authentication
Verifica que los tokens JWT se generan y validan correctamente
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gestion.models import Clientes
from jwt_auth import JWTAuthManager
from django.contrib.auth.hashers import make_password
from datetime import datetime
import json


def test_jwt_generation():
    """Test: Generar tokens JWT"""
    print("\n" + "="*60)
    print("TEST 1: Generar Tokens JWT")
    print("="*60)
    
    try:
        # Obtener un cliente de prueba
        cliente = Clientes.objects.filter(cli_pswd__isnull=False).first()
        
        if not cliente:
            print("⚠️  No hay clientes con contraseña para testing")
            return False
        
        print(f"Cliente: {cliente.cli_nomb} ({cliente.cli_emai})")
        
        # Generar tokens
        tokens = JWTAuthManager.generar_tokens(cliente)
        
        access_token = tokens['access']
        refresh_token = tokens['refresh']
        
        print(f"\n✓ Access Token generado:")
        print(f"  - Longitud: {len(access_token)} caracteres")
        print(f"  - Primeros 50 chars: {access_token[:50]}...")
        
        print(f"\n✓ Refresh Token generado:")
        print(f"  - Longitud: {len(refresh_token)} caracteres")
        print(f"  - Primeros 50 chars: {refresh_token[:50]}...")
        
        return tokens
        
    except Exception as e:
        print(f"✗ Error generando tokens: {str(e)}")
        return False


def test_jwt_verification(tokens):
    """Test: Verificar tokens JWT"""
    print("\n" + "="*60)
    print("TEST 2: Verificar Tokens JWT")
    print("="*60)
    
    try:
        # Verificar access token
        access_payload = JWTAuthManager.verificar_token(
            tokens['access'],
            token_type='access'
        )
        
        print("✓ Access Token válido:")
        print(f"  - cli_codi: {access_payload.get('cli_codi')}")
        print(f"  - email: {access_payload.get('email')}")
        print(f"  - tipo: {access_payload.get('type')}")
        print(f"  - expiración: {datetime.fromtimestamp(access_payload.get('exp'))}")
        
        # Verificar refresh token
        refresh_payload = JWTAuthManager.verificar_token(
            tokens['refresh'],
            token_type='refresh'
        )
        
        print("\n✓ Refresh Token válido:")
        print(f"  - cli_codi: {refresh_payload.get('cli_codi')}")
        print(f"  - tipo: {refresh_payload.get('type')}")
        print(f"  - expiración: {datetime.fromtimestamp(refresh_payload.get('exp'))}")
        
        return access_payload, refresh_payload
        
    except Exception as e:
        print(f"✗ Error verificando tokens: {str(e)}")
        return False, False


def test_jwt_extract_client_data(tokens):
    """Test: Extraer datos del cliente desde token"""
    print("\n" + "="*60)
    print("TEST 3: Extraer Datos del Cliente")
    print("="*60)
    
    try:
        client_data = JWTAuthManager.obtener_cliente_desde_token(tokens['access'])
        
        if client_data:
            print("✓ Datos extraídos del token:")
            print(f"  - ID: {client_data['cli_codi']}")
            print(f"  - Email: {client_data['email']}")
            print(f"  - Nombre: {client_data['nombre']}")
            return True
        else:
            print("✗ No se pudieron extraer datos")
            return False
            
    except Exception as e:
        print(f"✗ Error extrayendo datos: {str(e)}")
        return False


def test_jwt_token_revocation(tokens):
    """Test: Revocar token"""
    print("\n" + "="*60)
    print("TEST 4: Revocar Token (Logout)")
    print("="*60)
    
    try:
        access_token = tokens['access']
        
        # Revocar token
        JWTAuthManager.revocar_token(access_token)
        print("✓ Token revocado correctamente")
        
        # Intentar verificar token revocado
        try:
            JWTAuthManager.verificar_token(access_token, token_type='access')
            print("✗ Error: Token revocado todavía es válido")
            return False
        except Exception:
            print("✓ Token revocado detectado como inválido")
            return True
            
    except Exception as e:
        print(f"✗ Error revocando token: {str(e)}")
        return False


def test_invalid_token():
    """Test: Token inválido"""
    print("\n" + "="*60)
    print("TEST 5: Token Inválido")
    print("="*60)
    
    try:
        JWTAuthManager.verificar_token("token_invalido", token_type='access')
        print("✗ Debería haber fallado con token inválido")
        return False
    except Exception as e:
        print(f"✓ Token inválido detectado: {str(e)}")
        return True


def test_wrong_token_type():
    """Test: Tipo de token incorrecto"""
    print("\n" + "="*60)
    print("TEST 6: Validar Tipo de Token")
    print("="*60)
    
    try:
        # Generar tokens
        cliente = Clientes.objects.filter(cli_pswd__isnull=False).first()
        if not cliente:
            print("⚠️  No hay clientes para testing")
            return False
        
        tokens = JWTAuthManager.generar_tokens(cliente)
        
        # Intentar verificar refresh token como access token
        try:
            JWTAuthManager.verificar_token(tokens['refresh'], token_type='access')
            print("✗ Debería haber fallado con tipo incorrecto")
            return False
        except Exception as e:
            print(f"✓ Tipo de token incorrecto detectado: {str(e)}")
            return True
            
    except Exception as e:
        print(f"✗ Error en test: {str(e)}")
        return False


def main():
    """Ejecutar todos los tests"""
    print("\n" + "█"*60)
    print("█  JWT Authentication - Test Suite")
    print("█"*60)
    
    results = {}
    
    # Test 1: Generar tokens
    tokens = test_jwt_generation()
    results['Generar Tokens'] = bool(tokens)
    
    if tokens:
        # Test 2: Verificar tokens
        access_payload, refresh_payload = test_jwt_verification(tokens)
        results['Verificar Tokens'] = bool(access_payload and refresh_payload)
        
        # Test 3: Extraer datos
        results['Extraer Datos'] = test_jwt_extract_client_data(tokens)
        
        # Test 4: Revocar token
        results['Revocar Token'] = test_jwt_token_revocation(tokens)
    
    # Test 5: Token inválido
    results['Token Inválido'] = test_invalid_token()
    
    # Test 6: Tipo de token
    results['Tipo de Token'] = test_wrong_token_type()
    
    # Resumen
    print("\n" + "="*60)
    print("RESUMEN DE TESTS")
    print("="*60)
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    
    for test_name, result in results.items():
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name:.<40} {status}")
    
    print("\n" + "-"*60)
    print(f"Total: {passed}/{total} tests passed")
    print("="*60)
    
    if passed == total:
        print("\n✓ ¡Todos los tests pasaron correctamente!")
        print("✓ Sistema JWT está funcionando correctamente")
        return 0
    else:
        print("\n✗ Algunos tests fallaron")
        return 1


if __name__ == '__main__':
    sys.exit(main())
