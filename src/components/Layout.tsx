import Head from "./Head";
import Navbar from "./Navbar";
export default function Layout(props){
  return(
    <html>
      <Head title={props?.title} />
      <body class="dark:bg-slate-800 bg-slate-200 m-0 p-0 min-h-full">
        <Navbar />
        <div class="pt-24" />
        {props?.children}
        <script src="/fix.js" />
        </body>
      </html>
  )
}