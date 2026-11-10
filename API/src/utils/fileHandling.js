const fs = require('fs');

async function deleteFile(file) {
  if (!file) {
    return;
  }
  const filePath = typeof file === 'string' ? file : file.path;
  if (!filePath) {
    return;
  }
  await fs.promises.unlink(filePath).catch(() => {});
}

module.exports = { deleteFile };