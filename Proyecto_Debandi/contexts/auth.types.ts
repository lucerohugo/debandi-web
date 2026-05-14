export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  isAdmin?: boolean
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
}
