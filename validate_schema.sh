#!/bin/bash -e

# Script to validate JSON schemas and the JSON input data and TOML files
# against those schemas.

status_code=0

check() {
    local schema=$1
    shift
    local files=$*
    if [[ "$schema" = "meta" ]]; then
        args="--check-metaschema"
    else
        args="--schemafile $schema"
    fi
    if [[ -t 0 ]]; then
        args="$args --color always"
    fi
    set +e
    # shellcheck disable=SC2086
    check-jsonschema $args $files || status_code=1
    set -e
}

echo "Validating schemas in schema against metaschema"
check meta schema/*.json

echo "Validating fields.toml"
check schema/fields.json fields.toml

echo "Validating fixes.toml"
check schema/fixes.json fixes.toml

echo "Validating output.toml"
check schema/output.json output.toml

if ls top2000-*.json 1>/dev/null 2>&1; then
	echo "Validating JSON API responses: top2000-*.json"
	check schema/top2000.json top2000-*.json
fi

if ls output-*.json 1>/dev/null 2>&1; then
	echo "Validating JSON output format dumps: output-*.json"
	check schema/dump.json output-*.json
fi

echo "Validating pyproject.toml"
check  https://www.schemastore.org/pyproject.json pyproject.toml

echo "Validating package.json"
check  https://www.schemastore.org/package.json package.json

echo "Validating .jshintrc"
check  https://www.schemastore.org/jshintrc.json .jshintrc

echo "Validating tsconfig.json"
check https://www.schemastore.org/tsconfig.json tsconfig.json

exit $status_code
