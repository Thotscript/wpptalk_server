// middlewares/corsHeaders.js
export default function corsHeaders(req, res, next) {
  res.header('Access-Control-Allow-Origin', 'https://thebroker.vip');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
}
