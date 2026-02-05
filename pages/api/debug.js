export default async function handler(req, res) {
  try {
    const info = {
      status: "ok",
      message: "API is running",
      endpoint: "/api/debug",
      method: req.method,
      headers: req.headers,
      query: req.query,
      bodyType: typeof req.body,
      bodyIsBuffer: Buffer.isBuffer(req.body),
      bodyLength: req.body ? (Buffer.isBuffer(req.body) ? req.body.length : JSON.stringify(req.body).length) : 0,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(info);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
