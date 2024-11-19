export default function parseBody (req) {
  if (req.method !== 'POST') {
    return {}
  }
  return new Promise((resolve, reject) => {
    const bodyParts = []
    req.on('data', data => bodyParts.push(data.toString()))
    req.on('error', e => reject(e))
    req.on('end', () => resolve(bodyParts.length > 0 ? JSON.parse(bodyParts.join('')) : {}))
  })
}