import Layout from "./components/Layout";
import BlogCard, { BlogCode } from "./components/BlogCard";
export default async function main(c, db) {
  //get latest 10 blogs
  let blogs = await db.query("SELECT * FROM blog ORDER BY id DESC LIMIT 10");
  blogs = blogs[0].result;
  return c.html(
    <Layout title="Blog It!">
      <div class="mx-2 lg:mx-8">
        <div class="my-8 ml-8">
          <span class="font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-700 text-6xl py-8">Latest Blogs</span>
        </div>
        {/* create side scroll, hide scrollbar */}
        <div class="carousel w-full gap-4">
          {(blogs?.length > 0) ? blogs.map((blog) => {
            return <BlogCard image={blog.image} avatarURL={blog.authorpic} title={blog.title} author={blog.author} slug={blog.slug} />
          }) : <p class="text-2xl text-gray-500 dark:text-gray-300">No blogs found 😔</p>}
        </div>
        <script code={BlogCode}></script>
        <div class="my-8 ml-8">
          <span class="font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-700 text-6xl py-8">Popular Tags</span>
        </div><div class="flex flex-wrap gap-2 mb-4">
          <a href="/tag/javascript"
            class="py-2 px-4 rounded-xl font-bold bg-emerald-600/20 text-emerald-600/80 dark:bg-emerald-400/10 dark:text-emerald-400/80 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-600 uppercase transition-all transition-duration-300">
            #javascript</a>
          <a href="/tag/react"
            class="py-2 px-4 rounded-xl font-bold bg-red-600/20 text-red-600/80 dark:bg-red-400/10 dark:text-red-400/80 border-2 border-slate-200 dark:border-slate-800 hover:border-red-600 uppercase transition-all transition-duration-300">
            #react</a>
        </div>
      </div>
    </Layout>
  )
}