export const PASSWORD_MAX_LENGTH = 15

// Contador debajo del campo de contraseña; avisa en verde (no es un error) al llegar al límite
export default function PasswordLengthHint({ length }: { length: number }) {
  const atLimit = length >= PASSWORD_MAX_LENGTH
  return (
    <p className={`text-xs ${atLimit ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}`}>
      {atLimit
        ? `Llegaste al máximo de ${PASSWORD_MAX_LENGTH} caracteres`
        : `Hasta ${PASSWORD_MAX_LENGTH} caracteres (${length}/${PASSWORD_MAX_LENGTH})`}
    </p>
  )
}
