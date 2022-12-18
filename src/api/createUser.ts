import * as crypto from "node:crypto";
let generateID = function () {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
export default async function (c, db) {
  //get the data from the request
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    
      return new Response(JSON.stringify({ success: false, error: "Parse Error" }), {
        status: 400,
      });
  }
  const { name, email, password } = body;
  //create a new user
  if (!name || !email || !password) {
    return new Response(JSON.stringify({ success: false, error: "Missing data" }), {
      status: 400,
    });
  }
  if(email.indexOf("@") == -1 || email.indexOf(".") == -1){
    return new Response(JSON.stringify({ success: false, error: "Invalid email" }), {
      status: 400,
    });
  }
  //check if the user already exists
  let userExists = await db.query("SELECT * FROM user WHERE username = $name OR email = $email", {
    name, email
  });
  

  if (userExists[0].result.length > 0) {
    console.log(userExists);
    return new Response(JSON.stringify({ success: false, error: "User already exists" }), {
      status: 400,
    });
  }

  let salt = crypto.randomBytes(16).toString('hex');
  let hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

  let userCreated = await db.create("user", {
    username: name.trim(),
    id: "user-" + generateID(),
    email: email,
    salt: salt,
    hash: hash,
  });
  console.log(userCreated);
  //send the token to the user
  return new Response(JSON.stringify({ success: true, token: userCreated.hash }), {
    status: 200,
  });
}