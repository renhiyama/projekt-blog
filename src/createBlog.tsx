import Layout from "./components/Layout";
let code = `(async()=>{
//fetch user data
let user = await fetch("/api/getUser?token=" + localStorage.token).then((res) => res.json());
if (user.success) {
  let $ = document.querySelector.bind(document);
  let $$ = document.querySelectorAll.bind(document);
  //if user is logged in, initialize the editor
  //create a editor from scratch
  let boldButton = $("#bold");
  let italicButton = $("#italic");
  let underlineButton = $("#underline");
  let strikeButton = $("#strike");
  let blockquoteButton = $("#blockquote");
  let codeBlockButton = $("#code-block");
  let headerButton = $("#header");
  let listButton = $("#list");
  let orderedListButton = $("#ordered-list");
  let linkButton = $("#link");

  let textarea = $("#content");
  let renderButton = $("#render");
  let rendered = $("#rendered");
  textarea.addEventListener("keydown", () => {
    textarea.style.height = "1px";
   textarea.style.height = (25+textarea.scrollHeight)+"px";
  });
  //whenever a button is clicked, add the corresponding markdown to the textarea
  boldButton.addEventListener("click", () => {
    textarea.value += " **bold**";
    textarea.dispatchEvent(new Event("keydown"));
  });
  italicButton.addEventListener("click", () => {
    textarea.value += " *italic*";
    textarea.dispatchEvent(new Event("keydown"));
  });
  underlineButton.addEventListener("click", () => {
    textarea.value += " __underline__";
    textarea.dispatchEvent(new Event("keydown"));
  });
  strikeButton.addEventListener("click", () => {
    textarea.value += " ~~strike~~";
    textarea.dispatchEvent(new Event("keydown"));
  });
  blockquoteButton.addEventListener("click", () => {
    textarea.value += "\\n> blockquote";
    textarea.dispatchEvent(new Event("keydown"));
  });
  codeBlockButton.addEventListener("click", () => {
    textarea.value += "\\n\`\`\`js\\n//code block\\n\`\`\`";
    textarea.dispatchEvent(new Event("keydown"));
  });
  headerButton.addEventListener("click", () => {
    textarea.value += "\\n# header";
    textarea.dispatchEvent(new Event("keydown"));
  });
  listButton.addEventListener("click", () => {
    textarea.value += "\\n- list";
    textarea.dispatchEvent(new Event("keydown"));
  });
  orderedListButton.addEventListener("click", () => {
    //check if the last line starts with a number
    let lastLine = textarea.value.split("\\n").pop();
    if (lastLine.match(/^[0-9]+/)) {
      //if it does, add 1 to the number
      textarea.value += "\\n" + (parseInt(lastLine.match(/^[0-9]+/)[0]) + 1) + ". another ordered list";
    } else {
      //if it doesn't, start with 1
      textarea.value += "\\n1. ordered list";
    }
    textarea.dispatchEvent(new Event("keydown"));
  });
  linkButton.addEventListener("click", () => {
    textarea.value += " [link](https://example.com)";
    textarea.dispatchEvent(new Event("keydown"));
  });
  //when the render button is clicked, render the markdown
  renderButton.addEventListener("click", () => {
    //check if textarea has hidden class
    if (textarea.classList.contains("hidden")) {
      //if it has, remove the hidden class
      textarea.classList.remove("hidden");
      rendered.classList.add("hidden");
      renderButton.innerHTML = "Render";
    } else {
      //if it doesn't, add the hidden class
      
      renderButton.innerHTML = "Edit";
      //render the markdown
      rendered.innerHTML = marked.parse(textarea.value);
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
      textarea.classList.add("hidden");
      rendered.classList.remove("hidden");
    };
  });
}
else{
  //if user is not logged in, redirect to login page
  window.location.href = "/login";
}
})();
`;

export default async function createBlog(c) {
  return c.html(
    <Layout title="Create A New Blog!">
      <div class="mx-auto container bg-slate-800 p-8 rounded-md">
        <h1 class="font-extrabold text-white text-6xl py-8 text-centered">Create a blog!</h1>
        {/* horizontal divider */}
        <div class="mt-8 border-b-2 border-slate-500 w-1/2 mx-auto"></div>
        <div class="py-8">
          <form onsubmit="event.preventDefault();">
            <p class="text-white font-semibold text-xl py-2">Title</p>
            <input type="text" name="title" placeholder="Title"
              class="rounded-md bg-slate-900 p-4 text-white w-1/4 focus:outline-none border-slate-800 focus:border-indigo-700 border" />
            <p class="text-white font-semibold text-xl py-2">Content</p>

            <div id="toolbar" class="bg-indigo-600 p-2 rounded-t-md mx-auto">
              <button id="bold" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-md mx-2">Bold</button>
              <button id="italic" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-md mx-2">Italic</button>
              <button id="underline" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-md mx-2">Underline</button>
              <button id="strike" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-md mx-2">Strike</button>
              <button id="blockquote" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-md mx-2">Blockquote</button>
              <button id="code-block" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-md mx-2">Code Block</button>
              <button id="header" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-md mx-2">Header</button>
              <button id="list" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-md mx-2"> Bullet List</button>
              <button id="ordered-list" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-md mx-2">Ordered List</button>
              <button id="link" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-md mx-2">Link</button>
              <button id="render" class="bg-emerald-600 hover:bg-emerald-700 text-white text-lg text-bold py-2 px-4 font-bold rounded-lg ml-12 lg:ml-24">Show Output</button>
            </div>
            <textarea style="overflow:hidden"
              id="content" class="rounded-b-md bg-slate-900 p-4 text-white min-w-full focus:outline-none focus:border-indigo-700 focus:border">
              Write your blog here!
            </textarea>
            <div id="rendered" class="bg-gray-300 rounded-b-md p-4 dark:text-white min-w-full outline-none border-indigo-700 border hidden" />
            <p class="text-white font-semibold text-xl py-2">Tags</p>
            <input type="text" name="tags" placeholder="Tags"
              class="rounded-md bg-slate-900 p-4 text-white w-1/4 focus:outline-none border-slate-800 focus:border-indigo-700 border" />
              {/* create a centered button */}
              <div class="flex justify-center">
                <button type="submit"
                onclick={`
                //submit the post
                const title = document.querySelector("input[name=title]").value;
                const content = document.querySelector("textarea").value;
                const tags = document.querySelector("input[name=tags]").value;
                const data = {title, content, tags};
                fetch("/api/createBlog?token="+localStorage.token, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(data),
                }).then((res) => res.json()).then((data) => {
                  if(data.success===true){
                    //redirect to the blog
                    window.location.href = "/blog/" + data.slug;
                  }
                  else{
                    //show error
                    document.querySelector("#error").classList.remove("hidden");
                    document.querySelector("#error").innerText = data.error;
                  }
                });
                `}
                class="bg-emerald-600 hover:bg-emerald-700 text-white text-2xl text-bold py-2 px-4 font-bold rounded-lg">Create Blog</button>
              </div>
              <p id="error" class="text-red-500 py-2 hidden text-center"></p>
          </form>
        </div>
      </div>
      <script src="/marked.js" />
      <script code={code}></script>
    </Layout>
  )
}