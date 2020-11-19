import * as core from '@actions/core'
import fs, { Dirent } from 'fs';
import path from 'path';
import { signAabFile, signApkFile } from './sign';

function findReleaseFile(releaseDir: string): Dirent[] {
  return fs.readdirSync(releaseDir, { withFileTypes: true })
    .filter(item => !item.isDirectory())
    .filter(item => item.name.endsWith(".apk") || item.name.endsWith(".aab"));
}

async function run(): Promise<void> {
  try {
    const buildDir = core.getInput('buildDirectory') ?? "build";
    const releaseDirs = core.getInput('releaseDirectory').split('\n').filter(it => it !== '');
    const signingKeyBase64 = core.getInput('signingKeyBase64');
    const alias = core.getInput('alias');
    const keyStorePassword = core.getInput('keyStorePassword');
    const keyPassword = core.getInput('keyPassword');

    console.log(`Preparing signing key`);
    const signingKey = path.join(buildDir, 'signingKey.jks');
    fs.writeFileSync(signingKey, signingKeyBase64, 'base64');

    for await (const releaseDir of releaseDirs) {
      const releaseFiles = findReleaseFile(releaseDir);
      for await (const releaseFile of releaseFiles) {
        if (releaseFile !== undefined) {
          core.debug(`Found release to sign: ${releaseFile.name}`);
          const releaseFilePath = path.join(releaseDir, releaseFile.name);
          let signedReleaseFile = '';
          if (releaseFile.name.endsWith('.apk')) {
            signedReleaseFile = await signApkFile(releaseFilePath, signingKey, alias, keyStorePassword, keyPassword);
          } else if (releaseFile.name.endsWith('.aab')) {
            signedReleaseFile = await signAabFile(releaseFilePath, signingKey, alias, keyStorePassword, keyPassword);
          } else {
            core.error('No valid release file to sign, abort.');
            core.setFailed('No valid release file to sign.');
          }

          console.log('Release signed!');
          core.debug('Release signed! Setting outputs');

          core.exportVariable("SIGNED_RELEASE_FILE", signedReleaseFile);
          core.setOutput('signedReleaseFile', signedReleaseFile);
        } else {
          core.error("No release file (.apk or .aab) could be found. Abort.");
          core.setFailed('No release file (.apk or .aab) could be found.');
        }
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
