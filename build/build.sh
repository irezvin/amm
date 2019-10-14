#!/bin/bash
uglifyjs $(php ./list-cli.php ../js/classes) --mangle --source-map --output amm.min.js
gzip -c amm.min.js > amm.min.js.gz
