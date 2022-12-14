import * as crypto from "node:crypto";
let generateID = function (title) {
  //generate url friendly id
  let id = title.toLowerCase();
  id = id.replace(/[^a-z0-9]/g, "-");
  id = id.replace(/-+/g, "-");
  id = id.replace(/^-|-$/g, "");
  //add random string to end of id
  let random = crypto.randomBytes(4).toString("hex");
  id = id + "-" + random;
  return id;
}
export default async function(c, db){
  //get the data from the request query
  let token = c.req.query("token");
  if(!token){
    return new Response(JSON.stringify({success: false, error: "No Token"}), {
      status: 400,
    });
  }
  let user = await db.query("SELECT * FROM user WHERE hash = $token", {token});
  if(user[0].result.length === 0){
    return new Response(JSON.stringify({success: false, error: "Invalid Token"}), {
      status: 400,
    });
  }
  user = user[0].result[0];
  //get the data from the request body
  let body, title, content, tags;
  try{
    body = await c.req.json();
    title = body.title;
    content = body.content;
    tags = Array.from(new Set(body.tags.toLowerCase().split(" ").map(tag => tag.trim()).filter(tag => tag.length > 0)));
  }catch(e){
    return new Response(JSON.stringify({success: false, error: "Parse Error"}), {
      status: 400,
    });
  }
  if(!title || !content || !tags){
    return new Response(JSON.stringify({success: false, error: "Missing data"}), {
      status: 400,
    });
  }
  let blog = await db.create("blog", {
    title,
    content,
    tags,
    slug: generateID(title),
    author: user.username,
    image: Math.floor(Math.random() * 10)
    });
  return new Response(JSON.stringify({success: true, slug: blog.slug}), {
    status: 200,
  });
}