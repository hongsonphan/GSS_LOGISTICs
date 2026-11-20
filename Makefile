.PHONY: verify verify-full audit build up down

verify:
	python scripts/qa.py verify

verify-full:
	python scripts/qa.py verify --full

audit:
	python scripts/qa.py audit

build:
	python scripts/build_app_js.py
	python scripts/build_css.py

up:
	docker compose -p gss_logistics -f docker-compose.yml -f docker-compose.local.yml up -d --build

down:
	docker compose -p gss_logistics down
