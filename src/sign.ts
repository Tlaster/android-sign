import * as exec from '@actions/exec'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as path from 'path'
import * as fs from 'fs'

export async function signApkFile(
  apkFile: string,
  signingKeyFile: string,
  alias: string,
  keyStorePassword: string,
  keyPassword?: string
): Promise<string> {
  core.debug('Zipaligning APK file')

  // Find zipalign executable
  const buildToolsVersion = process.env.BUILD_TOOLS_VERSION || '30.0.2'
  const androidHome = process.env.ANDROID_HOME
  if (!androidHome) {
    core.error('require ANDROID_HOME to be execute')
    throw new Error('ANDROID_HOME is null')
  }
  const buildTools = path.join(androidHome, `build-tools/${buildToolsVersion}`)
  if (!fs.existsSync(buildTools)) {
    core.error(`Couldnt find the Android build tools @ ${buildTools}`)
  }

  const zipAlign = path.join(buildTools, 'zipalign')
  core.debug(`Found 'zipalign' @ ${zipAlign}`)

  // Align the apk file
  const alignedApkFile = apkFile.replace('.apk', '-aligned.apk')
  await exec.exec(`"${zipAlign}"`, ['-c', '-v', '4', apkFile])

  await exec.exec(`"cp"`, [apkFile, alignedApkFile])

  core.debug('Signing APK')

  // find apksigner path
  const apkSigner = path.join(buildTools, 'apksigner')
  core.debug(`Found 'apksigner' @ ${apkSigner}`)

  // apksigner sign --ks my-release-key.jks --out my-app-release.apk my-app-unsigned-aligned.apk
  const signedApkFile = apkFile.replace('.apk', '-signed.apk')
  const args = [
    'sign',
    '--ks',
    signingKeyFile,
    '--ks-key-alias',
    alias,
    '--ks-pass',
    `pass:${keyStorePassword}`,
    '--out',
    signedApkFile
  ]

  if (keyPassword) {
    args.push('--key-pass', `pass:${keyPassword}`)
  }
  args.push(alignedApkFile)

  await exec.exec(`"${apkSigner}"`, args)

  // Verify
  core.debug('Verifying signed APK')
  await exec.exec(`"${apkSigner}"`, ['verify', signedApkFile])

  return signedApkFile
}

export async function signAabFile(
  aabFile: string,
  signingKeyFile: string,
  alias: string,
  keyStorePassword: string,
  keyPassword?: string
): Promise<string> {
  core.debug('Signing AAB')
  const jarSignerPath = await io.which('jarsigner', true)
  core.debug(`Found 'jarsigner' @ ${jarSignerPath}`)

  // jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore myKeyStore.jks
  // -storepass myStorePassword -keypass myKeyPassword myUnsignedAAB.aab alias
  const args = [
    '-verbose',
    '-sigalg',
    'SHA256withRSA',
    '-digestalg',
    'SHA-256',
    '-keystore',
    signingKeyFile,
    '-storepass',
    keyStorePassword
  ]

  if (keyPassword) {
    args.push('-keypass', keyPassword)
  }

  args.push(aabFile, alias)

  await exec.exec(`"${jarSignerPath}"`, args)

  // Verify
  core.debug('Verifying signed AAB')
  await exec.exec(`"${jarSignerPath}"`, ['verify', aabFile])

  // Rename
  const signedFile = aabFile.replace('.aab', '-signed.aab')
  await exec.exec(`mv ${aabFile} ${signedFile}`)

  return signedFile
}
