#!/bin/sh
# Gradle wrapper script for Unix
GRADLE_OPTS="${GRADLE_OPTS:-"-Dfile.encoding=UTF-8"}"
exec gradle "$@"
