#!/bin/bash
cd /c/Users/tr/Desktop/stamped
until grep -q "dosya hazır" data/emblems/download.log; do sleep 10; done
node scripts/emblems/03-process.mjs > data/emblems/process.log 2>&1
node scripts/emblems/04-colors.mjs > data/emblems/colors.log 2>&1
node scripts/emblems/05-covers.mjs > data/emblems/covers.log 2>&1
echo CHAIN_DONE > data/emblems/chain.done
