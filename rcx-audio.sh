#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo "Usage: ./rcx-audio.sh <command> <working_directory> <csv_file> <account> [--auto-token]"
  echo ""
  echo "Commands:"
  echo "  upload   Upload audio files from a CSV list"
  echo ""
  echo "Examples:"
  echo "  ./rcx-audio.sh upload /Users/sergei/audio files.csv 2114002"
  echo "  ./rcx-audio.sh upload /Users/sergei/audio files.csv 2114002 --auto-token"
  exit 1
}

COMMAND="$1"

case "$COMMAND" in
  upload)
    shift
    bash "$SCRIPT_DIR/src/mac/upload.sh" "$@"
    ;;
  *)
    echo "❌ Unknown command: $COMMAND"
    usage
    ;;
esac
