export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  isAdmin?: boolean
  cli_codi?: number
  cli_desc?: number | string
  cli_precs1?: number | string
  cli_precs2?: number | string
  localidad?: string
  telefonoContacto?: string
}

export interface ImpersonationInfo {
  isImpersonating: boolean
  vendedor?: {
    ven_codi: number
    ven_nomb: string
  }
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  impersonation: ImpersonationInfo
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null | ((prev: User | null) => User | null)) => void
}
