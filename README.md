# Sign Android Release Action

Inspired by https://github.com/r0adkll/sign-android-release  
This action will help you sign an Android `.apk` or `.aab` (Android App Bundle) file for release.

## Inputs

### `releaseDirectory`

**Required:** The relative directory path in your project where your Android release file will be located, **it can be an array**.

### `signingKeyBase64`

**Required:** The base64 encoded signing key used to sign your app

This action will directly decode this input to a file to sign your release with. You can prepare your key by running this command on *nix systems.

```bash
openssl base64 < some_signing_key.jks | tr -d '\n' | tee some_signing_key.jks.base64.txt
```
Then copy the contents of the `.txt` file to your GH secrets

### `alias`

**Required:** The alias of your signing key 

### `keyStorePassword`

**Required:** The password to your signing keystore

### `keyPassword`

**Optional:** The private key password for your signing keystore

### `buildDirectory`

**Optional:** The working directory for action, default to `build`

### `output`

**Optional:** The output directory for sign, default to `build/signed`

## ENV: `BUILD_TOOLS_VERSION`

**Optional:** You can manually specify a version of build-tools to use. We use `30.0.2` by default.

## Example usage

```yaml
steps:
  # ...

  - uses: MatiasG19/android-sign@v2
    name: Sign app APK
    with:
      releaseDirectory: |
        app/build/outputs/apk/release
        app/build/outputs/bundle/release
      signingKeyBase64: ${{ secrets.SIGNING_KEY }}
      output: build/release/signed
      alias: ${{ secrets.ALIAS }}
      keyStorePassword: ${{ secrets.KEY_STORE_PASSWORD }}
      keyPassword: ${{ secrets.KEY_PASSWORD }}
    env:
      BUILD_TOOLS_VERSION: "30.0.2"
```