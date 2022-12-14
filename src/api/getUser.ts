export default async function (c, db) {
  //get the data from the request query
  let token = c.req.query("token");
  if(!token) {
    return new Response(JSON.stringify({ success: false, error: "No Token" }), {
      status: 400,
    });
  }
  let user = await db.query("SELECT * FROM user WHERE hash = $token", { token });
  if (user[0].result.length === 0) {
    return new Response(JSON.stringify({ success: false, error: "Invalid Token" }), {
      status: 400,
    });
  }
  user = user[0].result[0];
  return new Response(JSON.stringify({ success: true, user }), {
    status: 200,
  });
}