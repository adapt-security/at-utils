export default function parseQuery (req) {
  const [url, query] = req.url.split('?')
  if (!query) {
    return {}
  }
  req.url = url
  return query.split('&').reduce((q, s) => {
    const [k, v] = s.split('=')
    return { ...q, [k]: v }
  }, {})
}