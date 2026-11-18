// electron-builder afterPack hook: ad-hoc signs the macOS app so it runs on Apple Silicon
// without a paid Apple Developer certificate (users still confirm the first launch).
const { execFileSync } = require('child_process');
const path = require('path');
exports.default = async ctx => {
  if (ctx.electronPlatformName !== 'darwin') return;
  const app = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
};
