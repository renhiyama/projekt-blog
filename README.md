# Blogging Website, school project

Screenshots of the website:
Dark mode:

![](https://ren.reeee.ee/5PRopc9rm.png)
![](https://ren.reeee.ee/5PRoCvRK3.png)
![](https://ren.reeee.ee/5PRoIUr79.png)

Light Mode:
![](https://ren.reeee.ee/5PRoY4yMD.png)
![](https://ren.reeee.ee/5PRo_twFV.png)
![](https://ren.reeee.ee/5PRp7JwpN.png)

Setup on Linux/WSL:
1. Install Bun from https://bun.dev
2. Install SurrealDB from https://surrealdb.com/
3. Install git and clone this project
4. Run `bun i`
5. `surreal start --user root --pass root file://db` for db starting
6. `bun run nodemon` for starting the server with live reload
7. `bun run index.tsx` for starting the server without live reload

Optional:
- `bun run build` for building the project css