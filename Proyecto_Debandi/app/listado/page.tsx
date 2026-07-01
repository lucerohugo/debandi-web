import ListadoProductosClient from "./ListadoProductosClient"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
  }>
}) {
  const params = await searchParams
  const initialSearch = params.search ?? ""
  
  return (
    <ListadoProductosClient
      initialSearch={initialSearch}
    />
  )
}
