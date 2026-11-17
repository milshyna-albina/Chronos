const clients = new Map();

const sseService = {
  subscribe(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.set(req.user.id, res);
    req.on('close', () => {
      clients.delete(req.user.id);
    });
  },
  sendToUser(id, data) {
    const clientRes = clients.get(id);
    if (clientRes) {
      clientRes.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }
};

module.exports = { sseService };