.PHONY: actions-test-pr-created
.PHONY: actions-test-release-created

#TODO: fix this to use the correct workflow file
actions-test-frontend-ci:
	act -W '.github/workflows/frontend-ci.yml' --secret-file repo.secrets --container-architecture=linux/amd64

actions-test-messaging-ci:
	act -W '.github/workflows/messaging-ci.yml' --secret-file repo.secrets --container-architecture=linux/amd64

actions-test-core-ci:
	act -W '.github/workflows/core-ci.yml' --secret-file repo.secrets --container-architecture=linux/amd64

actions-test-moderation-ci:
	act -W '.github/workflows/moderation-ci.yml' --secret-file repo.secrets --container-architecture=linux/amd64

actions-test-matchmaking-ci:
	act -W '.github/workflows/matchmaking-ci.yml' --secret-file repo.secrets --container-architecture=linux/amd64

actions-test-release-created:
	act release --secret-file repo.secrets --container-architecture=linux/amd64

actions-deploy-core:
	act -W '.github/workflows/deploy-core.yml' --secret-file repo.secrets --container-architecture=linux/amd64

actions-deploy-moderation:
	act -W '.github/workflows/deploy-moderation.yml' --secret-file repo.secrets --container-architecture=linux/amd64

actions-deploy-matchmaking:
	act -W '.github/workflows/deploy-matchmaking.yml' --secret-file repo.secrets --container-architecture=linux/amd64

actions-deploy-messaging:
	act -W '.github/workflows/deploy-messaging.yml' --secret-file repo.secrets --container-architecture=linux/amd64

actions-deploy-frontend:
	act -W '.github/workflows/deploy-frontend.yml' --secret-file repo.secrets --container-architecture=linux/amd64

build-docs:
	cd docs && \
	python3 -m venv venv && \
	source venv/bin/activate && \
	pip install -r requirements.txt && \
	cd .. && \
	sphinx-build -b html docs/ _build/html

view-docs:
	open _build/html/index.html
