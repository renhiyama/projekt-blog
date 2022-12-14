import Layout from "./components/Layout";
let code = `function submitForm() {
  const form = document.getElementById('login');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  fetch('/api/createUser', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(function (res){return res.json()}).then(function(data){
    console.log(data);
    //save token to localstorage if successful
    if (data.success) {
      localStorage.setItem('token', data.token);
      window.location.href = '/';
    }
    else{
      alert('Failed to sign up:' + data.error);
      //reload page
      window.location.href = '/signup';
    }
  });
}`
export default async function main(c) {

  return c.html(
    <Layout title="Sign Up">
      <div class="mx-auto container bg-slate-800 p-8 max-w-md rounded-md">
      <h1 class="text-4xl text-white font-bold pb-8 text-center">Register Account</h1>
      <form id="login" onsubmit="event.preventDefault(); submitForm();">
        <p class="text-white font-semibold text-lg py-2">Name</p>
        <input type="text" name="name" placeholder="Name"
        class="rounded-md bg-slate-900 p-4 text-white min-w-full focus:outline-none focus:border-indigo-700 focus:border" />
        <p class="text-white font-semibold text-lg py-2">Email</p>
        <input type="email" name="email" placeholder="Email" 
        class="rounded-md bg-slate-900 p-4 text-white min-w-full focus:outline-none focus:border-indigo-700 focus:border" />
        <p class="text-white font-semibold text-lg py-2">Password</p>
        <input type="password" name="password" placeholder="Password"
        class="rounded-md bg-slate-900 p-4 text-white min-w-full focus:outline-none focus:border-indigo-700 focus:border" />
        <div class="mt-12">
        <input type="submit" value="Create Account"
        class="p-4 bg-indigo-600 text-white text-bold text-2xl rounded-md min-w-full hover:bg-indigo-700" />
        </div>
      </form>
      </div>
      <script>
        {code}
      </script>
    </Layout>
  )
}