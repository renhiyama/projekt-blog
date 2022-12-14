import * as crypto from "node:crypto";
export default async function (c, db) {
  //get password from request body
  let body, password, email;
  try {
    body = await c.req.json();
    password = body.password;
    email = body.email;
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "Parse Error" }), {
      status: 400
    });
  }
  if (!password) {
    return new Response(JSON.stringify({ success: false, error: "No password" }), {
      status: 400
    });
  }
  if (!email) {
    return new Response(JSON.stringify({ success: false, error: "No email" }), {
      status: 400
    });
  }
  let user = await db.query("SELECT * FROM user WHERE email = $email", { email });
  if (user[0].result.length === 0) {
    return new Response(JSON.stringify({ success: false, error: "Invalid email" }), {
      status: 400
    });
  }
  user = user[0].result[0];
  let hash = user.hash;
  let salt = user.salt;
  let inputHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  if (inputHash !== hash) {
    return new Response(JSON.stringify({ success: false, error: "Invalid password" }), {
      status: 400
    });
  }
  return new Response(JSON.stringify({ success: true, token: hash }), {
    status: 200
  });
}