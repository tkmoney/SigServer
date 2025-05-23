const express = require('express');
const { ExpressPeerServer } = require('peer');
const path = require('path');
const QRCode = require('qrcode');

// Create Express app
const app = express();

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// QR code generation endpoint (now with configurable size)
app.get('/qr', async (req, res) => {
  const { link, ID, size } = req.query;
  if (!link || !ID) {
    return res.status(400).send('Missing link or ID');
  }

  // pick up size param (px), default to 200
  const qrSize = parseInt(size, 10) || 200;

  // Compose target URL
  const separator = link.includes('?') ? '&' : '?';
  const target = `${link}${separator}ID=${encodeURIComponent(ID)}`;

  try {
    // pass width in options to control image dimensions
    const img = await QRCode.toBuffer(target, {
      width: qrSize,
      margin: 2,        // optional: white border
      errorCorrectionLevel: 'H'
    });

    res.type('png');
    res.send(img);
  } catch (err) {
    res.status(500).send(`Error generating QR code ${err.message}`);
  }
});

// Start HTTP or HTTPS server depending on SSL availability
const fs = require('fs');
const https = require('https');
const PORT = process.env.PORT || 3000;
let server;
try {
  const key = fs.readFileSync(process.env.SSL_KEY_PATH || path.join(__dirname, 'cert', 'key.pem'));
  const cert = fs.readFileSync(process.env.SSL_CERT_PATH || path.join(__dirname, 'cert', 'cert.pem'));
  server = https.createServer({ key, cert }, app).listen(PORT, () => {
    console.log(`HTTPS server running on https://localhost:${PORT}`);
  });
} catch (err) {
  server = app.listen(PORT, () => {
    console.log(`HTTP server running on http://localhost:${PORT}`);
  });
}

// Create PeerJS server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/'
});

// Mount PeerJS server on /peerjs
app.use('/peerjs', peerServer);
