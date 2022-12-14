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
    $('#userAvatar').src = user.avatarURL;
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
              <div class="w-10 rounded-full">
                <img id="userAvatar"
                 src='https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortRound&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=ShirtVNeck&clotheColor=Red&eyeType=Default&eyebrowType=DefaultNatural&mouthType=Default&skinColor=Light' />
              </div>
            </label>
            <ul tabIndex={0} class="mt-3 p-2 shadow menu menu-compact dropdown-content bg-slate-400 dark:bg-slate-600 rounded-box w-52 text-white">
              <li class="hover:bg-slate-500 dark:hover:bg-slate-900">
                <p id="username">User</p>
              </li>
              <li class="hidden hover:bg-slate-500 dark:hover:bg-slate-900" id="dash"><a to="/dash">Dashboard</a></li>
              <li class="hover:bg-slate-500 dark:hover:bg-slate-900"><a id="logg" href="/login">Login</a></li>
            </ul>
          </div>
        </div>
      </div>
      <script code={code}>
      </script>
    </div>
  );
}