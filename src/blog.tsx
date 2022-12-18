import Layout from "./components/Layout";

export default async function BlogPage(c, db) {
  let blog = await db.query("SELECT * FROM blog WHERE slug = $id", { id: c.req.param('id') });
  console.log(blog);
  if (blog[0].result.length == 0) return c.html("Blog not found");
  else {
    blog = blog[0].result[0];
    return c.html(
      <Layout title={"Blog"+blog.title}>
        <div id="page" class="mx-auto container bg-gray-300 dark:bg-slate-800 p-8 rounded-md hidden" data={JSON.stringify(blog)}>
          <figure class="my-16 rounded-t-md">
            <img src={`/images/${blog.image}.jpg`} alt="Shoes" class="mx-auto rounded-md" />
          </figure>
          <h1 class="text-7xl font-bold mt-8 ml-12 dark:text-white">{blog.title}</h1>
          <div class="flex mt-8 ">
            <div class="avatar ml-24">
              <div class="w-12 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
                  <path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
            <p class="text-slate-600 dark:text-slate-300 my-auto pl-4 text-2xl"> By {blog.author || "Author"}</p>
          </div>
          {/* div seperator */}
          <div class="border-gray-500 dark:border-slate-700 border-t-2 mt-8 mx-auto w-1/2"></div>
          <div id="rendered" class="mt-8 mx-2 lg:mx-8">

          </div>
        </div>
        <script src="/marked.js"></script>
        <script code={`
          let blog = document.getElementById('page').getAttribute("data");
          document.getElementById('page').removeAttribute("data");
          blog = JSON.parse(blog);
          console.log(blog);
          let $$ = document.querySelectorAll.bind(document);
          document.getElementById('rendered').innerHTML = marked.parse(blog.content);
          $$("#rendered h1").forEach((el)=>{
            el.classList.add("dark:text-white", "text-5xl", "font-bold", "mb-4");
          });
          $$("#rendered h2").forEach((el)=>{
            el.classList.add("dark:text-white", "text-4xl", "font-bold", "mb-4");
          });
          $$("#rendered h3").forEach((el)=>{
            el.classList.add("dark:text-white", "text-3xl", "font-bold", "mb-4");
          });
          $$("#rendered p").forEach((el)=>{
            el.classList.add("dark:text-white", "text-lg", "mb-4");
          });
          $$("#rendered a").forEach((el)=>{
            el.classList.add("text-blue-600", "dark:text-blue-500", "hover:underline");
          });
          $$("#rendered strong").forEach((el)=>{
            el.classList.add("font-extrabold");
          });
          $$("#rendered pre").forEach((el)=>{
            el.classList.add("bg-gray-900", "rounded-md", "p-4", "text-white", "my-2");
          });
          $$("#rendered ul").forEach((el)=>{
            el.classList.add("list-disc", "list-inside");
          });
          $$("#rendered ol").forEach((el)=>{
            el.classList.add("list-decimal", "list-inside");
          });
          $$("#rendered blockquote").forEach((el)=>{
            el.classList.add("border-l-4", "border-gray-500", "pl-4", "italic");
          });
          document.getElementById('page').classList.remove("hidden");
        `} />
      </Layout>
    )
  }
}