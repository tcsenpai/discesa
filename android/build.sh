#!/usr/bin/env bash
# Builds android/discesa.apk without Gradle: aapt2 + javac + d8 + apksigner.
# Needs: Android SDK (platform 33 + build-tools 33) and a JDK 11+.
#   ANDROID_HOME  default ~/Android/Sdk
#   JAVA_HOME     default: mise's temurin-17, else whatever java is on PATH
#   VERSION       version name, e.g. 1.2.3 (default 1.0.0; the version code is derived from it)
#   KEYSTORE, KEYSTORE_PASS, KEY_ALIAS   release signing; without them a local debug key is used
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
BT="$SDK/build-tools/${BUILD_TOOLS:-33.0.0}"
JAR="$SDK/platforms/android-33/android.jar"
if [ -z "${JAVA_HOME:-}" ] && command -v mise >/dev/null; then JAVA_HOME="$(mise where java@temurin-17 2>/dev/null || true)"; fi
[ -n "${JAVA_HOME:-}" ] && export JAVA_HOME PATH="$JAVA_HOME/bin:$PATH"
for f in "$BT/aapt2" "$BT/d8" "$JAR"; do [ -e "$f" ] || { echo "missing: $f" >&2; exit 1; }; done

B=build; rm -rf "$B"; mkdir -p "$B/assets" "$B/classes" "$B/gen"
# game files go into the APK so it runs offline
cp ../index.html "$B/assets/"; cp -R ../vendor "$B/assets/"

"$BT/aapt2" compile --dir res -o "$B/res.zip"
VER="${VERSION:-1.0.0}"; IFS=. read -r MA MI PA <<<"$VER"
CODE=$(( ${MA:-1}*10000 + ${MI:-0}*100 + ${PA:-0} ))
"$BT/aapt2" link -I "$JAR" --manifest AndroidManifest.xml -A "$B/assets" \
  --version-name "$VER" --version-code "$CODE" \
  --java "$B/gen" -o "$B/unsigned.apk" "$B/res.zip"
javac --release 8 -classpath "$JAR" -d "$B/classes" \
  $(find src "$B/gen" -name '*.java')
"$BT/d8" --min-api 24 --lib "$JAR" --output "$B" $(find "$B/classes" -name '*.class')
(cd "$B" && zip -q unsigned.apk classes.dex)
"$BT/zipalign" -f 4 "$B/unsigned.apk" "$B/aligned.apk"

KS="${KEYSTORE:-debug.keystore}"; KSP="${KEYSTORE_PASS:-android}"; KA="${KEY_ALIAS:-debug}"
[ -f "$KS" ] || [ -n "${KEYSTORE:-}" ] || keytool -genkeypair -keystore "$KS" -storepass android -keypass android \
  -alias debug -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Discesa Debug" >/dev/null
"$BT/apksigner" sign --v4-signing-enabled false --ks "$KS" --ks-pass "pass:$KSP" --ks-key-alias "$KA" --out discesa.apk "$B/aligned.apk"
"$BT/apksigner" verify discesa.apk && ls -lh discesa.apk
