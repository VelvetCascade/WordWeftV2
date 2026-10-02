#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir/backend"
maven_command="${WORDWEFT_MAVEN_COMMAND:-mvn}"
if ! command -v "$maven_command" >/dev/null 2>&1; then
  echo "Maven is required. Install Maven or set WORDWEFT_MAVEN_COMMAND to its executable path." >&2
  exit 1
fi
java_command=java
javac_command=javac
if [[ -n "${JAVA_HOME:-}" ]]; then
  java_command="$JAVA_HOME/bin/java"
  javac_command="$JAVA_HOME/bin/javac"
fi
if ! command -v "$java_command" >/dev/null 2>&1 || ! command -v "$javac_command" >/dev/null 2>&1; then
  echo "A full Java 17+ JDK is required (java and javac). Install a JDK or set JAVA_HOME to its directory." >&2
  exit 1
fi
javac_version="$("$javac_command" -version 2>&1)"
javac_major="${javac_version#javac }"
javac_major="${javac_major%%.*}"
if [[ ! "$javac_major" =~ ^[0-9]+$ ]] || (( javac_major < 17 )); then
  echo "Java 17+ is required; found $javac_version. Select a newer JDK with JAVA_HOME." >&2
  exit 1
fi
maven_args=(-B -ntp)
if [[ -n "${WORDWEFT_MAVEN_SETTINGS:-}" ]]; then
  maven_args+=(-s "$WORDWEFT_MAVEN_SETTINGS")
fi

classpath_file="$repo_dir/backend/target/local-development-classpath.txt"
"$maven_command" "${maven_args[@]}" test-compile dependency:build-classpath "-Dmdep.outputFile=$classpath_file"
# The test runner fixes MongoDB, JWT, mail and upload configuration internally.
# Neither production environment values nor command line overrides are used.
exec "$java_command" -cp "target/test-classes:target/classes:$(cat "$classpath_file")" com.wordweft.dev.LocalDevelopmentPreview
