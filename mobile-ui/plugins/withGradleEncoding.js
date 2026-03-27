/**
 * Expo config plugin: fixes Gradle JVM encoding for paths with non-ASCII characters.
 * Required because the project path contains Turkish characters (ğ in "Demiroğlu")
 * which causes Gradle to fail on Windows without explicit UTF-8 encoding flags.
 */
const { withGradleProperties } = require('@expo/config-plugins');

const withGradleEncoding = (config) => {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    // Find and update the jvmargs line
    const jvmArgsIndex = props.findIndex(
      (p) => p.type === 'property' && p.key === 'org.gradle.jvmargs'
    );

    const encodingFlags = '-Dfile.encoding=UTF-8 -Dsun.stdout.encoding=UTF-8 -Dsun.stderr.encoding=UTF-8';

    if (jvmArgsIndex !== -1) {
      const current = props[jvmArgsIndex].value;
      if (!current.includes('-Dfile.encoding=UTF-8')) {
        props[jvmArgsIndex].value = `${current} ${encodingFlags}`;
      }
    } else {
      props.push({
        type: 'property',
        key: 'org.gradle.jvmargs',
        value: `-Xmx2048m -XX:MaxMetaspaceSize=512m ${encodingFlags}`,
      });
    }

    // Allow non-ASCII characters in project path (required for Turkish chars on Windows)
    const overrideIndex = props.findIndex(
      (p) => p.type === 'property' && p.key === 'android.overridePathCheck'
    );
    if (overrideIndex === -1) {
      props.push({ type: 'property', key: 'android.overridePathCheck', value: 'true' });
    }

    return config;
  });
};

module.exports = withGradleEncoding;
