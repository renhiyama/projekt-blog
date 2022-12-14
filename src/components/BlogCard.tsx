export let BlogCode = `(async()=>{
  //find all heart buttons
  let heartButtons = document.querySelectorAll("button[name='heart']");
  //find all bookmark buttons
  let bookmarkButtons = document.querySelectorAll("button[name='bookmark']");
  let heartFilledSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>';
  let heartEmptySVG = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
  let bookmarkFilledSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path fill-rule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clip-rule="evenodd" /></svg>';
  let bookmarkEmptySVG = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>';
  //add event listeners to all heart buttons
  heartButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      let filled = button.getAttribute("filled");
      if (filled == "false") {
        button.innerHTML = heartFilledSVG;
        button.setAttribute("filled", "true");
      } else {
        button.innerHTML = heartEmptySVG;
        button.setAttribute("filled", "false");
      }
    });
  });
  //add event listeners to all bookmark buttons
  bookmarkButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      let filled = button.getAttribute("filled");
      if (filled == "false") {
        button.innerHTML = bookmarkFilledSVG;
        button.setAttribute("filled", "true");
      } else {
        button.innerHTML = bookmarkEmptySVG;
        button.setAttribute("filled", "false");
      }
    });
  });
})()`;

export default function BlogCard(props) {
  return (
    <div class="card w-96 bg-base-100 dark:bg-slate-900 shadow-xl carousel-item relative">
      <figure class="px-10 pt-10 w-full">
        <img src={props.img || "https://placeimg.com/400/225/arch"} alt="Shoes" class="rounded-xl" />
      </figure>
      <div class="card-body">
        <div class="flex">
          <div class="avatar">
            <div class="w-8 rounded-full">
              <img src={props.avatarURL || "https://placeimg.com/192/192/people"} />
            </div>
          </div>
          <p class="text-slate-600 dark:text-slate-300 my-auto pl-4"> By {props.author || "Author"}</p>
        </div>
        <h2 class="dark:text-white text-2xl pl-8 font-bold">{props.title || "Blog Title"}</h2>
        <div class="card-actions">
          <button class="my-auto text-pink-700" name="heart" filled="false">
            {/* heart button */}
            <svg
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>

          </button>
          <button class="mr-auto my-auto text-blue-600" name="bookmark" filled="false">
            {/* bookmark button */}
            <svg
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </button>
          <a href={props.slug?`/blogs/${props.slug}`:"#"} class="rounded-md text-white text-semibold px-8 py-2 bg-indigo-600 hover:bg-indigo-700 ml-auto">View</a>
        </div>
      </div>
    </div>
  )
}