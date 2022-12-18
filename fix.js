//find all script tags with code attribute
let scripts = document.querySelectorAll('script[code]');
//unescape function unescapes html entities
let unescaped = function (str) {
  return str.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};
//loop through each script tag
scripts.forEach(function(script) {
  //get the code attribute
  let code = script.getAttribute('code');
  //create a new script tag
  let newScript = document.createElement('script');
  //set the innerHTML of the new script tag to the code attribute
  newScript.innerHTML = unescaped(code);
  //replace the old script tag with the new one
  script.replaceWith(newScript);
});
window.genBlogDiv = (props) => {
  let div = document.createElement('div');
  div.innerHTML = `<div class="card w-80 lg:w-96 bg-base-100 dark:bg-slate-900 shadow-xl carousel-item relative">
  <figure class="w-full rounded-t-md">
    <img src="/images/${props.image}.jpg" alt="Image" />
  </figure>
  <div class="card-body">
    <div class="flex">
      <div class="avatar">
        <div class="w-8 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
              <path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clip-rule="evenodd" />
            </svg>
        </div>
      </div>
      <p class="text-slate-600 dark:text-slate-300 my-auto pl-4"> By ${props.author || "Author"}</p>
    </div>
    <h2 class="dark:text-white text-2xl pl-8 font-bold">${props.title || "Blog Title"}</h2>
    <div class="card-actions">
      <button class="my-auto text-pink-700" name="heart" filled="false">
        <svg
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>

      </button>
      <button class="mr-auto my-auto text-blue-600" name="bookmark" filled="false">
        <svg
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      </button>
      <a href="/blog/${props.slug}" class="rounded-md text-white text-semibold px-8 py-2 bg-indigo-600 hover:bg-indigo-700 ml-auto">View</a>
    </div>
  </div>
</div>`;
  return div.firstChild.outerHTML;
};