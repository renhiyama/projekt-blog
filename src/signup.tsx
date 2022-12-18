import Layout from "./components/Layout";
let code = `function submitForm() {
  const form = document.getElementById('login');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const submit = document.getElementById('submit');
  submit.disabled = true;
  submit.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
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
      const error = document.getElementById('error');
      error.innerHTML = data.error;
      error.classList.remove('hidden');
      error.parentElement.classList.add('mt-4');
      submit.disabled = false;
    }
  });
}`
export default async function main(c) {

  return c.html(
    <Layout title="Sign Up">
      <div class="mx-auto container bg-slate-800 p-8 max-w-md rounded-md">
        <h1 class="text-4xl text-white font-bold pb-8 text-center">Register Account</h1>
        <form id="login" onsubmit="event.preventDefault();">
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
            <p class="hidden text-red-500 text-center mb-4" id="error"></p>
            <button onclick="submitForm();" type="submit" id="submit"
              class="text-centered p-4 bg-indigo-600 text-white text-bold text-2xl rounded-md min-w-full hover:bg-indigo-700">
              <p>Register</p>
            </button>
            {/* create a link centered */}
            <div class="text-center mt-4">
              <a href="/login" class="text-blue-500 hover:underline">Already have an account? Login</a>
            </div>
          </div>
        </form>
      </div>
      <script code={code}>
      </script>
    </Layout>
  )
}