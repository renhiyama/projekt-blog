import { Hono } from "hono";
import { logger } from 'hono/logger'

import Surreal from "surrealdb.js";
import rootPage from "./src/index.js";
import loginPage from "./src/login.js";
import signUpPage from "./src/signup.js";
import dash from "./src/dash.jsx";
import createBlogFrontend from "./src/createBlog.js";
import rootApi from "./src/api/index.js";
import { serveStatic } from 'hono/serve-static.bun'
import createUser from "./src/api/createUser";
import createBlog from "./src/api/createBlog.js";
import BlogPage from "./src/blog.js";
import getToken from "./src/api/getToken.js";
import getUser from "./src/api/getUser.js";
import getPosts from "./src/api/getPosts.js";
const app = new Hono();
let db = new Surreal('http://127.0.0.1:8000/rpc');

await db.signin({
  user: 'root',
  pass: 'root',
});

// Select a specific namespace / database
await db.use('test', 'test');
console.log("[DB] Connected to SurrealDB");

app.use('*', logger())
app.get("/", async (c) => { return await rootPage(c, db) });
app.get("/login", loginPage);
app.get("/signup", signUpPage);
//serve images directory
app.get("/images/*", serveStatic({ root: "./" }));
app.get("/dash", dash);
app.get("/createBlog", createBlogFrontend);
app.post("/api/createUser", async (c) => { return await createUser(c, db) });
app.get("/api/getUser", async (c) => { return await getUser(c, db) });
app.post("/api/createBlog", async (c) => { return await createBlog(c, db) });
app.get("/blog/:id", async (c) => { return await BlogPage(c, db) });
app.post("/api/getToken", async (c) => { return await getToken(c, db) });
app.get("/api/getPosts", async (c) => { return await getPosts(c, db) });
app.get("/api", rootApi);
app.get("/build.css", serveStatic({ path: "./build.css" }));
app.get("/fix.js", serveStatic({ path: "./fix.js" }));
app.get("/marked.js", serveStatic({ path: "./marked.js" }));
export default {
  port: 3000,
  fetch: app.fetch,
}
console.log('Server is running at http://localhost:3000')