export default async function (c) {
  return new Response(
    JSON.stringify({ hello: "world" }),
    { status: 200 })
}