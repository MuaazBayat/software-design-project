# software-design-project
Final year comp sci project at the University of the Witwatersrand

#Docs
To get the docs working, 
1. Setup virtual env in /docs
2. Install requirements
3. Cd back into root
4. `sphinx-build -b html docs/ _build/html`
5. `open _build/html/index.html`



## Github Actions - CI-CD and Act
We are using github actions for our CI-CD pipeline.
To test locally one may use `act` check it out [here](https://nektosact.com/installation/).
Testing locally relies on secrets being supplied to the runner. We pass this in with a ruby based `repo.secrets` env file. Contact the Admins to supply you with the file. It belongs in the repo root dir. For completeness, here is a sample :)

```
export DOCKER_HUB_TOKEN='dckr_*****'
export DOCKER_HUB_USERNAME='*****'
```

We have layered an abstraction atop of act via a makefile with some sensible defaults althoug we highly recommed checking out the docs for your own implementations and testing.

