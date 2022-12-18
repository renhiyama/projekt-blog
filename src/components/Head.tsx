//export head element, with importing twind@next module and setting it up
export default function Head(props){
  return(
    <head>
      <title>{props?.title || "No Title?!"}</title>
      <link rel="stylesheet" href="/build.css" />
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
  )
}