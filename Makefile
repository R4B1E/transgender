filename := docker-compose.yml

build:
	docker compose -f ${filename} up --build

restart:
	docker compose -f ${filename} restart

stop:
	docker compose -f ${filename} stop

logs:
	docker compose -f ${filename} logs --follow --tail=0

attach:
	docker compose -f ${filename} attach

list:
	docker compose -f ${filename} ps --all

.PHONY: restart build stop list logs attach

all: build

fclean :
	docker compose -f ${filename} down
	