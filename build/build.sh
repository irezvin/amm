#!/bin/bash
list=$(php ./list-cli.php ../js/classes)
cat $list > amm.full.js
gzip -c amm.full.js > amm.full.js.gz
uglifyjs $list --mangle --source-map --output amm.min.js
gzip -c amm.min.js > amm.min.js.gz
