import Layout from "./components/Layout";

let code = `(async()=>{
//fetch user data
let user = await fetch("/api/getUser?token=" + localStorage.token).then((res) => res.json());
if (user.success) {
  //set username
  user = user.user;
  document.querySelector("#un").innerText = user.username;
  //fetch posts by user
  let posts = await fetch("/api/getPosts?token=" + localStorage.token).then((res) => res.json());
  if (posts.posts.length == 0) {
    //if user has no posts, display message
    document.querySelector("#posts").innerHTML = "<h1 class='text-3xl font-bold'>You have no posts yet!</h1>";
  }
  else {
    //if user has posts, display them
    let html = "";
    posts.posts.forEach((post) => {
      html+=window.genBlogDiv(post);
    });
    document.querySelector("#posts").innerHTML = html;
}
}
else{
  //if user is not logged in, redirect to login page
  window.location.href = "/login";
}
})();
`;

export default async function (c) {
  return c.html(
    <Layout title="Dashboard">
      <div class="mx-2 lg:mx-8">
        <h1 class="font-extrabold dark:text-white text-6xl py-8">Welcome Back, <span id="un">User</span></h1>
        <div id="posts">
        <h1 class='text-3xl font-bold'>Loading...</h1>
        </div>
        {/* create a centered button called "Create a blog" */}
        <div class="mt-8 flex justify-center">
          <a href="/createBlog" class="bg-indigo-500 hover:bg-indigo-700 text-white text-xl font-bold py-2 px-4 rounded-md">Write a new blog!</a>
          </div>
        </div>
      <script code={code}></script>
      </Layout>
  )
}