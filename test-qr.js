const QRCode = require('qrcode-generator');

console.log('Testing QR code generation...');

try {
  const qr = QRCode(0, 'M');
  qr.addData('https://example.com');
  qr.make();
  const dataUrl = qr.createDataURL(4, 0);
  console.log('QR code generated successfully, length:', dataUrl.length);
  console.log('First 100 chars:', dataUrl.substring(0, 100));
} catch (error) {
  console.error('QR Code generation error:', error);
}
