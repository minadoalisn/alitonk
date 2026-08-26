const path = require('node:path');
const { createStaticServer } = require('./scripts/lib/static-server');

const port = Number(process.env.PORT || 3000);
createStaticServer(path.join(__dirname, 'public')).listen(port, () => {
  console.log(`ALI Charity static preview running on http://localhost:${port}`);
});
