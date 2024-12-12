#!/bin/bash

# Script to validate JSON schemas and the JSON input data and TOML files
# against those schemas.

echo "Validating schemas in schema against metaschema"
check-jsonschema --check-metaschema schema/*.json

echo "Validating JSON API responses"
check-jsonschema --schemafile schema/top2000.json top2000-*.json

echo "Validating fields.toml"
check-jsonschema --schemafile schema/fields.json fields.toml

echo "Validating fixes.toml"
check-jsonschema --schemafile schema/fixes.json fixes.toml

echo "Validating output.toml"
check-jsonschema --schemafile schema/output.json output.toml

if ls output-*.json 1>/dev/null 2>&1; then
	echo "Validating output-*.json"
	check-jsonschema --schemafile schema/dump.json output-*.json
fi