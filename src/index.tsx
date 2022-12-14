import Layout from "./components/Layout";
import BlogCard, { BlogCode } from "./components/BlogCard";
export default async function main(c, db) {
  //get latest blogs via sql query
  let blogs = await db.query("SELECT * FROM blogs ORDER BY id DESC LIMIT 10");
  blogs = blogs[0].result;
  console.log(blogs);
  return c.html(
    <Layout title="Hello?">
      <div class="mx-8">
        <h1 class="font-extrabold dark:text-white text-6xl py-8">Latest Blogs</h1>
        {/* create side scroll, hide scrollbar */}
        <div class="carousel w-full gap-4">
          {(blogs.length > 0) ? blogs.map((blog) => {
            return <BlogCard img={blog.photo} avatarURL={blog.authorpic} title={blog.title} author={blog.author} />
            }) : <p class="text-2xl text-gray-500 dark:text-gray-300">No blogs found 😔</p>}
          </div>
        <script code={BlogCode}></script>
      </div>
    </Layout>
  )
}