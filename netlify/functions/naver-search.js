export default async (req) => {
  const url = new URL(req.url)
  const query = url.searchParams.get('query') || ''
  const display = url.searchParams.get('display') || '20'

  const res = await fetch(
    `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=${display}`,
    {
      headers: {
        'X-Naver-Client-Id': 'lLKzrmO5gcIG4A_hZTLW',
        'X-Naver-Client-Secret': 'V5GJqoTD91',
      },
    }
  )

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/naver/v1/search/book.json' }
