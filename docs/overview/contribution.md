# Contributing Guidelines

First off — thanks for wanting to contribute! 🎉  
We want to make it easy for you to jump in and keep things consistent, so here’s how we work.

---

### Branching Strategy

We use a **feature-branch workflow**:

- **`develop`** → Latest merged work, ready for QA.  
- **Feature branches** → For new features or fixes.  

Since our docker tags fail with `\` in the branch name, we have opted to use `-` instead.  
An example branch is `feature-myfeature`

We use conventional branches and conventional commits. Check out the docs on them [here](https://conventional-branch.github.io/) and [here](https://www.conventionalcommits.org/en/v1.0.0/).
**Naming your branch**  
Please use this format:

### Github Actions and Ci-Cd
We are using github actions for our CI-CD pipeline.
To test locally one may use `act` check it out [here](https://nektosact.com/installation/).
Testing locally relies on secrets being supplied to the runner. We pass this in with a `repo.secrets` env file. 
The secrets suppied contain config for the runner to login to dockerhub and deploy on Google Cloud Run but also the frontend env vars as NextJS requires these at build time. (we cannot supply them into cloud run). Read more about this [here](../frontend/nextjs.md)

Contact the Admins to supply you with the file. It belongs in the repo root dir. For completeness, here is a sample :)

```
export DOCKER_HUB_TOKEN='dckr_*****'
export DOCKER_HUB_USERNAME='*****'
export GCP_PROJECT_ID='****'
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='*****'
export CLERK_SECRET_KEY='*****'
```

We have layered an abstraction atop of act via a makefile with some sensible defaults although we highly recommend checking out the docs for your own implementations and testing.

### Read the Docs and Sphinx
The easiest way to get started with the docs is by using the makefile in the root dir. Simply `make build-docs` to build and update the docs, and `make view-docs` to check it out.  
If all is well it should work and on successfully merging into develop it will get deployed to our livesite at [https://software-design-project.readthedocs.io/en/latest/](https://software-design-project.readthedocs.io/en/latest/).

To alter readthedocs settings contact muaaz for access.

### Microservices
We have opted for a microservices arhcitecture within our Github mono Repo. The reason is simple: **We have a skilled team** of 6 members who are more than
capable of building out features on their own. We thus do not want to step on each others toes when we start moving fast.
We prefer to keep our services seperate in order to cater for this speed and agility.

We have setup team of 3:
- Team 1: Muaaz and Muhammad Hoosen  
- Team 2: Arno and Sufyaan  
- Team 3: Rameez and Huzaifah  

The teams have been setup this way to compliment each others technical abilities.
Each team will be responsible for certain services, namely:  

Team 1:
- Core
- Moderation

Team 2:
- Messaging

Team 3:
- Matchmaking
- Profile

All teams will work on the frontend service.

### Our services

#### Core
The core service is the main backend which will hold any business logic outside the scope of the smaller function specific microservices.

#### Moderation
The moderation service is the 