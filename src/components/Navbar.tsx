//export tailwind navbar
import Link from "./Link";
let code = `function logout(e){
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = '/';
  };
  (async()=> {
  if(localStorage.token == undefined) return;
  const res = await fetch(\`/api/getUser?token=\${localStorage.token}\`);
  const data = await res.json();
  if (data.success) {
    let $ = document.querySelector.bind(document);
    let user = data.user;
    $('#username').innerText = user.username;
    $('#logg').innerText = 'Logout';
    $('#logg').onclick = logout;
    $('#logg').href = '/';
    $('#dash').classList.remove('hidden');
  }
  else{
    localStorage.removeItem('token');
  }
  })();
  `
export default function Navbar() {
  return (
    <div class="z-[1000] fixed mt-2 min-w-full mb-16">
      <div class="flex navbar bg-gradient-to-r from-purple-600 to-pink-600 rounded-box mx-auto max-w-7xl">
        <div class="flex-1">
          <Link to="/" class="btn btn-ghost font-bold text-xl text-white">Blog.It!</Link>
        </div>
        <div class="flex-none gap-2">
          <div class="dropdown dropdown-end">
            <label tabIndex={0} class="btn btn-ghost btn-circle avatar">
              <div class="w-10 rounded-full dark:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
                  <path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </label>
            <ul tabIndex={0} class="mt-3 p-2 shadow menu menu-compact dropdown-content bg-slate-600 rounded-box w-52 text-white">
              <li class="">
                <p id="username">User</p>
              </li>
              <li class="hidden hover:bg-indigo-600 dark:hover:bg-indigo-700" id="dash"><a href="/dash">Dashboard</a></li>
              <li class="hover:bg-indigo-600 dark:hover:bg-indigo-700"><a id="logg" href="/login">Login</a></li>
            </ul>
          </div>
        </div>
      </div>
      <script code={code}>
      </script>
    </div>
  );
}