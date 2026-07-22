#!/bin/bash
DIR="$( cd "$( dirname "$0" )" && pwd -P )"
cd / && cd "$DIR" && exec ./node_modules/.bin/electron "$DIR/main.js"
