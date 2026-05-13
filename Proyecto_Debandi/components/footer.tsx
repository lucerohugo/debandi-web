"use client"

import Link from "next/link"
import { Facebook, Instagram, Twitter, Mail } from "lucide-react"
import { useConfig } from "@/contexts/config-context"

export default function Footer() {
  const { config } = useConfig()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-secondary text-secondary-foreground border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-4">{config?.gen_nomb}</h3>
            <p className="text-sm opacity-75">{config?.gen_raz}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Productos</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="hover:opacity-75 transition">
                  Taladros
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:opacity-75 transition">
                  Sierras
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:opacity-75 transition">
                  Lijadoras
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:opacity-75 transition">
                  Herramientas Manuales
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Soporte</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contacto" className="hover:opacity-75 transition">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:opacity-75 transition">
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:opacity-75 transition">
                  Envíos
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:opacity-75 transition">
                  Otro
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Síguenos</h4>
            <div className="flex gap-4">
              <a href="#" className="hover:opacity-75 transition">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="hover:opacity-75 transition">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="hover:opacity-75 transition">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:opacity-75 transition">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/20 pt-8 flex flex-col md:flex-row items-center justify-between text-sm">
          <p>&copy; {currentYear}. Todos los derechos reservados.</p> 
          <div className="flex gap-6 mt-4 md:mt-0">
            {config?.gen_tele && <p>Tel: {config.gen_tele}</p>}
            {config?.gen_emai && <p>{config.gen_emai}</p>}
          </div>
        </div>
      </div>
    </footer>
  )
}
