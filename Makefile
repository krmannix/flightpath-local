.PHONY: format test build dev

format:
	npm run format

test:
	npm test

build:
	# no build step needed for node.js

dev:
	node server.js
