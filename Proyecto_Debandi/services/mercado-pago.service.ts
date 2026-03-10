import { ApiService } from './api.service'

export interface MercadoPagoPreference {
  preference_id: string
  init_point: string
  sandbox_init_point: string
  public_key: string
  total: number
  items_count: number
}

export interface PaymentStatus {
  payment_id: string
  status: 'approved' | 'pending' | 'rejected' | 'cancelled'
  status_detail: string
  amount: number
  payer_email: string
  installments: number
}

export class MercadoPagoService {
  private static readonly API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

  /**
   * Crear preferencia de pago en Mercado Pago
   * @param total Total del pedido
   * @param items Array de items con art_codi, cantidad, precio
   */
  static async createPreference(
    total: number,
    items: Array<{ art_codi: number; cantidad: number; precio: number }>
  ): Promise<MercadoPagoPreference> {
    const response = await fetch(`${this.API_URL}/mercado-pago/create-preference/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ total, items })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al crear preferencia')
    }

    return await response.json()
  }

  /**
   * Obtener estado de un pago
   * @param paymentId ID del pago de Mercado Pago
   */
  static async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const response = await fetch(
      `${this.API_URL}/mercado-pago/payment-status/?payment_id=${paymentId}`,
      {
        credentials: 'include'
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al obtener estado del pago')
    }

    return await response.json()
  }

  /**
   * Cargar script de Mercado Pago en el DOM
   */
  static loadMercadoPagoScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://sdk.mercadopago.com/js/v2'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('No se pudo cargar el script de Mercado Pago'))
      document.head.appendChild(script)
    })
  }

  /**
   * Inicializar wallet de Mercado Pago
   * @param publicKey Clave pública de Mercado Pago
   * @param preferenceId ID de la preferencia
   * @param containerId ID del contenedor donde se renderizará el botón
   */
  static initWallet(publicKey: string, preferenceId: string, containerId: string) {
    // @ts-ignore - Mercado Pago SDK
    if (window.MercadoPago) {
      // @ts-ignore
      const mp = new window.MercadoPago(publicKey)
      // @ts-ignore
      mp.bricks().create('wallet', {
        initialization: {
          preferenceId: preferenceId
        },
        customization: {
          texts: {
            valueProp: 'Pagos seguros con Mercado Pago'
          }
        }
      }, containerId)
    }
  }

  /**
   * Redirigir a Mercado Pago
   * @param initPoint URL de inicialización de Mercado Pago
   */
  static redirectToMercadoPago(initPoint: string) {
    window.location.href = initPoint
  }
}
