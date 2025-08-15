.PHONY: actions-test-pr-created
.PHONY: actions-test-release-created

#TODO: fix this to use the correct workflow file
actions-test-pr-created:
	act -W '.github/workflows/frontend-ci.yml' --secret-file repo.secrets --container-architecture=linux/amd64

actions-test-release-created:
	act -W '.github/workflows/release.yml' --secret-file repo.secrets --container-architecture=linux/amd64