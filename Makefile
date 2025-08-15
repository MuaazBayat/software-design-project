.PHONY: actions-test-pr-created
.PHONY: actions-test-release-created

#TODO: fix this to use the correct workflow file
actions-test-pr-created:
	act -W '.github/workflows/frontend-ci.yml' --secret-file repo.secrets --container-architecture=linux/amd64

actions-test-release-created:
	act -W '.github/workflows/release.yml' --secret-file repo.secrets --container-architecture=linux/amd64

build-docs:
	cd docs && \
	python3 -m venv venv && \
	source venv/bin/activate && \
	pip install -r requirements.txt && \
	cd .. && \
	sphinx-build -b html docs/ _build/html

view-docs:
	open _build/html/index.html
