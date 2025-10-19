<img width="1123" height="286" alt="Group2" src="https://github.com/user-attachments/assets/7fc3d527-5b8e-4ab4-8215-0e77f1d3142a" />

# GlobeTalk - SDP Project
Final year comp sci project at the University of the Witwatersrand

This repository is a monorepo with 5 services:
- Frontend (NextJS)
- Core (FastAPI)
- Matchmaking (FastAPI)
- Messaging (FastAPI)
- Moderation (FastAPI)

Getting the whole project up and running in development requires some environment var files that you can get from muaaz@helm.africa .Once you have both sets, you need to save them in the correct places and source them correctly.

# Quikstart
## Frontend
1. Save the `.env` for NextJS in `/services/frontend`
2. Then run `npm i` followed by `npm run dev`
Note : The env vars are configured to use production microservices so as to not run the whole stack locally. But it can be done. Read below to see how.

## Backend API's
0. Save the `.env` for Python Backend API's in `<root_folder>` or wherever else you want
For each service:
1. Setup a python environment with `python3 -m venv ve`
2. Activate the virtualenv with `source ./ve/bin/activate`
3. Install deps with `pip install -r requirements.txt`
4. Source the env vars `source ./../../.env` (use the path to wherever you saved it, use this if you sued root folder)
5. Run server with `uvicorn main:app --host 0.0.0.0 --port <port> --reload`
Note: Remember to use a different port for each service, and to set the frontend env vars to use these `localhost:<port>` urls.

Goodluck and happy coding!

To check out the docs for this project run `make build-docs` followed by `make view-docs` where you'll find in depth guides and config for everything GlobeTalk.


