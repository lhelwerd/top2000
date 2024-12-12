#!/bin/bash

# Script to validate JSON schemas and the JSON input data and TOML files
# against those schemas.

echo "Validating schemas in schema against metaschema"
check-jsonschema --check-metaschema schema/*.json

echo "Validating fields.toml"
check-jsonschema --schemafile schema/fields.json fields.toml

echo "Validating fixes.toml"
check-jsonschema --schemafile schema/fixes.json fixes.toml

echo "Validating output.toml"
check-jsonschema --schemafile schema/output.json output.toml

if ls top2000-*.json 1>/dev/null 2>&1; then
	echo "Validating JSON API responses: top2000-*.json"
	check-jsonschema --schemafile schema/top2000.json top2000-*.json
fi

if ls output-*.json 1>/dev/null 2>&1; then
	echo "Validating JSON output format dumps: output-*.json"
	check-jsonschema --schemafile schema/dump.json output-*.json
fi
