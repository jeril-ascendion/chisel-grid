// Local development server — mimics Lambda invocation
import { createServer } from 'node:http';

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ChiselGrid API running', env: 'local' }));
});

server.listen(3001, () => {
  console.warn('ChiselGrid API dev server running on http://localhost:3001');
});
