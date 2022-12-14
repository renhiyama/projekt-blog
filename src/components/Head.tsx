//export head element, with importing twind@next module and setting it up
export default function Head(props){
  return(
    <head>
      <title>{props?.title || "No Title?!"}</title>
      <link rel="stylesheet" href="/build.css" />
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://twemoji.maxcdn.com/v/latest/twemoji.min.js" crossorigin="anonymous"></script>
      <script code={`twemoji.parse(document.body,{
  folder: 'svg',
  ext: '.svg',
  callback: function(icon, options, variant) {
    switch ( icon ) {
        case 'a9':      // © copyright
        case 'ae':      // ® registered trademark
        case '2122':    // ™ trademark
            return false;
    }
    return ''.concat(options.base, options.size, '/', icon, options.ext);
}
});`}/>
    </head>
  )
}